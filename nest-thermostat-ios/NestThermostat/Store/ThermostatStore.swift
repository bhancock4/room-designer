import Foundation

/// Owns device state, polling, and command dispatch.
///
/// Setpoint changes are applied optimistically and debounced: tapping +/- five
/// times sends one command, not five. SDM rate-limits setpoint commands per
/// device (HTTP 429 when exceeded), so this is load-bearing, not polish.
@MainActor
final class ThermostatStore: ObservableObject {
    @Published private(set) var thermostats: [Thermostat] = []
    @Published private(set) var isLoading = false
    @Published private(set) var lastRefresh: Date?
    @Published var errorMessage: String?

    private let client: SDMClient
    private var pollTask: Task<Void, Never>?
    private var pendingSetpoint: [Thermostat.ID: Task<Void, Never>] = [:]

    static let pollInterval: TimeInterval = 30
    static let setpointDebounce: TimeInterval = 0.8

    init(client: SDMClient) {
        self.client = client
    }

    // MARK: - Reading

    func refresh() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let devices = try await client.listDevices()
            // Don't clobber a value the user just changed and hasn't sent yet.
            let fresh = devices.compactMap(Thermostat.init(device:))
            thermostats = fresh.map { new in
                if pendingSetpoint[new.id] != nil, let local = thermostats.first(where: { $0.id == new.id }) {
                    var merged = new
                    merged.heatCelsius = local.heatCelsius
                    merged.coolCelsius = local.coolCelsius
                    return merged
                }
                return new
            }
            lastRefresh = Date()
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func startPolling() {
        stopPolling()
        pollTask = Task { [weak self] in
            while !Task.isCancelled {
                await self?.refresh()
                try? await Task.sleep(for: .seconds(Self.pollInterval))
            }
        }
    }

    func stopPolling() {
        pollTask?.cancel()
        pollTask = nil
    }

    // MARK: - Commands

    func setMode(_ mode: Thermostat.Mode, on id: Thermostat.ID) {
        update(id) { $0.mode = mode }
        send(.setMode(mode), to: id)
    }

    func setEco(_ on: Bool, on id: Thermostat.ID) {
        update(id) { $0.ecoOn = on }
        send(.setEco(on), to: id)
    }

    func setFan(_ on: Bool, minutes: Int = 15, on id: Thermostat.ID) {
        update(id) { $0.fanTimerOn = on }
        send(.setFanTimer(on: on, seconds: minutes * 60), to: id)
    }

    enum Setpoint { case heat, cool }

    /// Nudge a setpoint by `ticks` UI steps (±1 °F or ±0.5 °C). Optimistic + debounced.
    func nudge(_ which: Setpoint, by ticks: Int, on id: Thermostat.ID) {
        guard var t = thermostats.first(where: { $0.id == id }) else { return }
        let delta = Double(ticks) * Temp.step(t.scale)
        switch which {
        case .heat:
            let v = Temp.clamp(Temp.snap((t.heatCelsius ?? 20) + delta, t.scale))
            t.heatCelsius = v
            // keep a sane gap in HEATCOOL (Nest enforces ~1.5 °C)
            if t.mode == .heatCool, let c = t.coolCelsius, c - v < 1.5 { t.coolCelsius = v + 1.5 }
        case .cool:
            let v = Temp.clamp(Temp.snap((t.coolCelsius ?? 24) + delta, t.scale))
            t.coolCelsius = v
            if t.mode == .heatCool, let h = t.heatCelsius, v - h < 1.5 { t.heatCelsius = v - 1.5 }
        }
        update(id) { $0 = t }

        pendingSetpoint[id]?.cancel()
        pendingSetpoint[id] = Task { [weak self] in
            try? await Task.sleep(for: .seconds(Self.setpointDebounce))
            guard !Task.isCancelled, let self else { return }
            self.pendingSetpoint[id] = nil
            guard let cur = self.thermostats.first(where: { $0.id == id }) else { return }
            let cmd: SDMCommand?
            switch cur.mode {
            case .heat: cmd = cur.heatCelsius.map { .setHeat(celsius: $0) }
            case .cool: cmd = cur.coolCelsius.map { .setCool(celsius: $0) }
            case .heatCool:
                if let h = cur.heatCelsius, let c = cur.coolCelsius { cmd = .setRange(heatCelsius: h, coolCelsius: c) } else { cmd = nil }
            case .off: cmd = nil
            }
            if let cmd { self.send(cmd, to: id) }
        }
    }

    // MARK: -

    private func update(_ id: Thermostat.ID, _ f: (inout Thermostat) -> Void) {
        guard let i = thermostats.firstIndex(where: { $0.id == id }) else { return }
        f(&thermostats[i])
    }

    private func send(_ cmd: SDMCommand, to id: Thermostat.ID) {
        Task {
            do {
                try await client.execute(cmd, on: id)
                // Pull truth back; device may have rounded or rejected silently.
                try? await Task.sleep(for: .seconds(1.5))
                if let d = try? await client.device(named: id), let t = Thermostat(device: d) {
                    update(id) { $0 = t }
                }
            } catch {
                errorMessage = error.localizedDescription
                await refresh()
            }
        }
    }
}
