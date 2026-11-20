import SwiftUI

@main
struct NestThermostatApp: App {
    @StateObject private var auth = GoogleAuth()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
        }
    }
}
