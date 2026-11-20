import SwiftUI

struct ThermostatListView: View {
    @StateObject var store: ThermostatStore
    @EnvironmentObject private var auth: GoogleAuth
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        NavigationStack {
            Group {
                if store.thermostats.isEmpty && store.isLoading {
                    ProgressView("Loading devices…")
                } else if store.thermostats.isEmpty {
                    ContentUnavailableView(
                        "No thermostats",
                        systemImage: "thermometer.slash",
                        description: Text(store.errorMessage ?? "The signed-in account shared no thermostats with this app. Re-sign-in and pick devices in the Google consent screen.")
                    )
                } else if store.thermostats.count == 1 {
                    ThermostatView(store: store, id: store.thermostats[0].id)
                } else {
                    List(store.thermostats) { t in
                        NavigationLink(value: t.id) {
                            HStack {
                                Text(t.displayName)
                                Spacer()
                                Text(Temp.format(t.ambientCelsius, t.scale)).foregroundStyle(.secondary)
                            }
                        }
                    }
                    .navigationDestination(for: Thermostat.ID.self) { id in
                        ThermostatView(store: store, id: id)
                    }
                }
            }
            .navigationTitle("Nest")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Refresh") { Task { await store.refresh() } }
                        Button("Sign out", role: .destructive) { auth.signOut() }
                    } label: { Image(systemName: "ellipsis.circle") }
                }
            }
            .refreshable { await store.refresh() }
            .overlay(alignment: .bottom) {
                if let err = store.errorMessage, !store.thermostats.isEmpty {
                    Text(err)
                        .font(.footnote)
                        .padding(8)
                        .background(.red.opacity(0.9), in: RoundedRectangle(cornerRadius: 8))
                        .foregroundStyle(.white)
                        .padding()
                        .onTapGesture { store.errorMessage = nil }
                }
            }
        }
        .task { store.startPolling() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { store.startPolling() } else { store.stopPolling() }
        }
    }
}
