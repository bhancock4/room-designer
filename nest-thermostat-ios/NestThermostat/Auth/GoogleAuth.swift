import AuthenticationServices
import CryptoKit
import Foundation
import UIKit

struct OAuthTokens: Codable {
    var accessToken: String
    var refreshToken: String
    var expiresAt: Date
}

/// Google OAuth for the Device Access program.
///
/// Flow: open the Partner Connections Manager (PCM) URL in an
/// ASWebAuthenticationSession -> user picks which Nest devices to share ->
/// Google redirects to `com.googleusercontent.apps.<id>:/oauthredirect?code=...`
/// -> exchange the code at Google's token endpoint. iOS OAuth clients have no
/// client secret; PKCE protects the exchange instead.
@MainActor
final class GoogleAuth: NSObject, ObservableObject {
    @Published private(set) var isSignedIn = false
    @Published private(set) var lastError: String?

    /// Set to false if PCM ever refuses/strips `code_challenge` (then the
    /// exchange will fail with invalid_grant and this is the first thing to try).
    static let usePKCE = true

    private static let scope = "https://www.googleapis.com/auth/sdm.service"
    private static let tokenEndpoint = URL(string: "https://oauth2.googleapis.com/token")!

    private let keychain = Keychain(service: "nest-thermostat.oauth")
    private let account = "google"
    private var tokens: OAuthTokens? {
        didSet {
            isSignedIn = tokens != nil
            if let tokens, let data = try? JSONEncoder().encode(tokens) {
                try? keychain.set(data, account: account)
            } else {
                keychain.delete(account: account)
            }
        }
    }
    private var session: ASWebAuthenticationSession?

    override init() {
        super.init()
        if let data = keychain.get(account: account),
           let saved = try? JSONDecoder().decode(OAuthTokens.self, from: data) {
            tokens = saved
        }
        // didSet does not fire inside init.
        isSignedIn = tokens != nil
    }

    // MARK: - Public

    func signIn() async {
        lastError = nil
        do {
            let verifier = Self.randomURLSafe(32)
            let code = try await authorize(verifier: verifier)
            tokens = try await exchange(code: code, verifier: verifier)
        } catch {
            lastError = (error as? AuthError)?.description ?? error.localizedDescription
        }
    }

    func signOut() {
        tokens = nil
    }

    /// Returns a bearer token, refreshing when it expires within 60s.
    func validAccessToken() async throws -> String {
        guard var t = tokens else { throw AuthError.signedOut }
        if t.expiresAt.timeIntervalSinceNow > 60 { return t.accessToken }
        t = try await refresh(t)
        tokens = t
        return t.accessToken
    }

    // MARK: - Authorization (browser)

    private func authorize(verifier: String) async throws -> String {
        // PCM URL: lets the user pick which structures/devices the app may see.
        var comps = URLComponents(string:
            "https://nestservices.google.com/partnerconnections/\(AppConfig.sdmProjectID)/auth")!
        var items = [
            URLQueryItem(name: "redirect_uri", value: AppConfig.redirectURI),
            URLQueryItem(name: "access_type", value: "offline"),
            URLQueryItem(name: "prompt", value: "consent"),
            URLQueryItem(name: "client_id", value: AppConfig.googleClientID),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: Self.scope),
            URLQueryItem(name: "state", value: Self.randomURLSafe(16)),
        ]
        if Self.usePKCE {
            items.append(URLQueryItem(name: "code_challenge", value: Self.s256(verifier)))
            items.append(URLQueryItem(name: "code_challenge_method", value: "S256"))
        }
        comps.queryItems = items
        let expectedState = items.first { $0.name == "state" }!.value!

        let callback: URL = try await withCheckedThrowingContinuation { cont in
            let s = ASWebAuthenticationSession(
                url: comps.url!,
                callbackURLScheme: AppConfig.reversedClientID
            ) { url, error in
                if let url { cont.resume(returning: url) }
                else { cont.resume(throwing: error ?? AuthError.cancelled) }
            }
            s.presentationContextProvider = self
            s.prefersEphemeralWebBrowserSession = false
            self.session = s
            s.start()
        }

        let q = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems ?? []
        func param(_ n: String) -> String? { q.first { $0.name == n }?.value }
        if let err = param("error") { throw AuthError.google(err) }
        guard param("state") == expectedState else { throw AuthError.stateMismatch }
        guard let code = param("code") else { throw AuthError.noCode }
        return code
    }

    // MARK: - Token endpoint

    private func exchange(code: String, verifier: String) async throws -> OAuthTokens {
        var form = [
            "code": code,
            "client_id": AppConfig.googleClientID,
            "redirect_uri": AppConfig.redirectURI,
            "grant_type": "authorization_code",
        ]
        if Self.usePKCE { form["code_verifier"] = verifier }
        let r = try await postForm(form)
        guard let refresh = r.refresh_token else { throw AuthError.noRefreshToken }
        return OAuthTokens(accessToken: r.access_token, refreshToken: refresh,
                           expiresAt: Date().addingTimeInterval(r.expires_in))
    }

    private func refresh(_ old: OAuthTokens) async throws -> OAuthTokens {
        let r = try await postForm([
            "client_id": AppConfig.googleClientID,
            "refresh_token": old.refreshToken,
            "grant_type": "refresh_token",
        ])
        return OAuthTokens(accessToken: r.access_token,
                           refreshToken: r.refresh_token ?? old.refreshToken,
                           expiresAt: Date().addingTimeInterval(r.expires_in))
    }

    private struct TokenResponse: Decodable {
        let access_token: String
        let expires_in: TimeInterval
        let refresh_token: String?
    }
    private struct TokenError: Decodable { let error: String; let error_description: String? }

    private func postForm(_ form: [String: String]) async throws -> TokenResponse {
        var req = URLRequest(url: Self.tokenEndpoint)
        req.httpMethod = "POST"
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        req.httpBody = form.map { "\($0.key)=\(Self.formEncode($0.value))" }
            .joined(separator: "&").data(using: .utf8)
        let (data, resp) = try await URLSession.shared.data(for: req)
        let status = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            if let e = try? JSONDecoder().decode(TokenError.self, from: data) {
                // invalid_grant on refresh means the user revoked access: force re-login.
                if e.error == "invalid_grant" { tokens = nil }
                throw AuthError.google("\(e.error): \(e.error_description ?? "")")
            }
            throw AuthError.http(status)
        }
        return try JSONDecoder().decode(TokenResponse.self, from: data)
    }

    // MARK: - Helpers

    private static func formEncode(_ s: String) -> String {
        var allowed = CharacterSet.alphanumerics
        allowed.insert(charactersIn: "-._~")
        return s.addingPercentEncoding(withAllowedCharacters: allowed) ?? s
    }

    private static func randomURLSafe(_ bytes: Int) -> String {
        var b = [UInt8](repeating: 0, count: bytes)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes, &b)
        return base64URL(Data(b))
    }

    private static func s256(_ verifier: String) -> String {
        base64URL(Data(SHA256.hash(data: Data(verifier.utf8))))
    }

    private static func base64URL(_ d: Data) -> String {
        d.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    enum AuthError: Error, CustomStringConvertible {
        case signedOut, cancelled, stateMismatch, noCode, noRefreshToken
        case google(String), http(Int)
        var description: String {
            switch self {
            case .signedOut: return "Not signed in."
            case .cancelled: return "Sign-in cancelled."
            case .stateMismatch: return "OAuth state mismatch (possible replay)."
            case .noCode: return "Google returned no authorization code."
            case .noRefreshToken: return "No refresh token returned. Revoke the app at myaccount.google.com/permissions and sign in again."
            case .google(let s): return "Google: \(s)"
            case .http(let c): return "Token endpoint HTTP \(c)"
            }
        }
    }
}

extension GoogleAuth: ASWebAuthenticationPresentationContextProviding {
    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated {
            let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            return scenes.flatMap(\.windows).first { $0.isKeyWindow } ?? ASPresentationAnchor()
        }
    }
}
