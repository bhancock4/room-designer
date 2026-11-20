import SwiftUI

struct RootView: View {
    @EnvironmentObject private var auth: GoogleAuth

    var body: some View {
        if !AppConfig.isConfigured {
            ConfigMissingView()
        } else if auth.isSignedIn {
            ThermostatListView(store: ThermostatStore(
                client: SDMClient(auth: auth, projectID: AppConfig.sdmProjectID)))
        } else {
            SignInView()
        }
    }
}

struct ConfigMissingView: View {
    var body: some View {
        ContentUnavailableView(
            "Not configured",
            systemImage: "gearshape.2",
            description: Text("Copy Secrets.xcconfig.example to Secrets.xcconfig, fill in your Device Access project id and Google OAuth client id, then rebuild.")
        )
    }
}

struct SignInView: View {
    @EnvironmentObject private var auth: GoogleAuth
    @State private var busy = false

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "thermometer.medium")
                .font(.system(size: 72))
                .foregroundStyle(.orange)
            Text("Nest Thermostat").font(.largeTitle.bold())
            Text("Sign in with the Google account that owns your Nest devices. You'll pick which thermostats to share.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal)
            Button {
                busy = true
                Task { await auth.signIn(); busy = false }
            } label: {
                Label("Sign in with Google", systemImage: "person.badge.key")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(busy)
            .padding(.horizontal, 40)
            if let err = auth.lastError {
                Text(err).font(.footnote).foregroundStyle(.red).multilineTextAlignment(.center).padding(.horizontal)
            }
        }
        .padding()
    }
}
