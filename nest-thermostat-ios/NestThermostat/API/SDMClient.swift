import Foundation

/// Thin client for the Smart Device Management REST API.
/// https://developers.google.com/nest/device-access/reference/rest
struct SDMClient {
    let auth: GoogleAuth
    let projectID: String
    var session: URLSession = .shared

    private var base: URL {
        URL(string: "https://smartdevicemanagement.googleapis.com/v1/enterprises/\(projectID)")!
    }

    func listDevices() async throws -> [SDMDevice] {
        let list: SDMDeviceList = try await request(url: base.appendingPathComponent("devices"))
        return list.devices ?? []
    }

    /// `name` is the full resource name from `SDMDevice.name`.
    func device(named name: String) async throws -> SDMDevice {
        try await request(url: URL(string: "https://smartdevicemanagement.googleapis.com/v1/\(name)")!)
    }

    func execute(_ command: SDMCommand, on name: String) async throws {
        let url = URL(string: "https://smartdevicemanagement.googleapis.com/v1/\(name):executeCommand")!
        let body = try JSONEncoder().encode(command)
        struct Empty: Decodable {}
        let _: Empty = try await request(url: url, method: "POST", body: body)
    }

    // MARK: -

    private func request<T: Decodable>(url: URL, method: String = "GET", body: Data? = nil) async throws -> T {
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.httpBody = body
        if body != nil { req.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        let token = try await auth.validAccessToken()
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await session.data(for: req)
        let status = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            if let env = try? JSONDecoder().decode(SDMErrorEnvelope.self, from: data) {
                throw SDMError.api(code: env.error.code, message: env.error.message)
            }
            throw SDMError.http(status)
        }
        if data.isEmpty || data == Data("{}".utf8) {
            if let empty = try? JSONDecoder().decode(T.self, from: Data("{}".utf8)) { return empty }
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    enum SDMError: Error, LocalizedError {
        case api(code: Int, message: String)
        case http(Int)
        var errorDescription: String? {
            switch self {
            case .api(let code, let message):
                // 429 = you hit the per-device command rate limit. Back off.
                return "SDM \(code): \(message)"
            case .http(let s): return "HTTP \(s)"
            }
        }
    }
}
