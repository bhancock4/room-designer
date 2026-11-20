import Foundation

/// Values are injected via Secrets.xcconfig -> Info.plist (see project.yml).
enum AppConfig {
    static let sdmProjectID = infoString("SDM_PROJECT_ID")
    static let googleClientID = infoString("GOOGLE_CLIENT_ID")

    /// `1234-abc.apps.googleusercontent.com` -> `com.googleusercontent.apps.1234-abc`
    static var reversedClientID: String {
        googleClientID.split(separator: ".").reversed().joined(separator: ".")
    }

    /// Google's required redirect for iOS OAuth clients.
    static var redirectURI: String { "\(reversedClientID):/oauthredirect" }

    static var isConfigured: Bool {
        !sdmProjectID.isEmpty && !googleClientID.isEmpty
            && !sdmProjectID.hasPrefix("YOUR_") && !googleClientID.hasPrefix("YOUR_")
    }

    private static func infoString(_ key: String) -> String {
        (Bundle.main.object(forInfoDictionaryKey: key) as? String) ?? ""
    }
}
