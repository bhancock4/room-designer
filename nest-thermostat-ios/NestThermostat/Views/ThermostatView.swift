import SwiftUI

struct ThermostatView: View {
    @ObservedObject var store: ThermostatStore
    let id: Thermostat.ID

    private var t: Thermostat? { store.thermostats.first { $0.id == id } }

    var body: some View {
        if let t {
            ScrollView {
                VStack(spacing: 28) {
                    header(t)
                    ambient(t)
                    modePicker(t)
                    setpoints(t)
                    toggles(t)
                    footer
                }
                .padding()
            }
            .navigationTitle(t.displayName)
            .navigationBarTitleDisplayMode(.inline)
        } else {
            ContentUnavailableView("Device gone", systemImage: "questionmark.circle")
        }
    }

    // MARK: - Sections

    private func header(_ t: Thermostat) -> some View {
        HStack(spacing: 8) {
            Circle().fill(statusColor(t)).frame(width: 10, height: 10)
            Text(statusText(t)).font(.subheadline).foregroundStyle(.secondary)
            if !t.isOnline { Text("• Offline").font(.subheadline).foregroundStyle(.red) }
        }
    }

    private func ambient(_ t: Thermostat) -> some View {
        VStack(spacing: 4) {
            Text(Temp.format(t.ambientCelsius, t.scale, unit: false))
                .font(.system(size: 96, weight: .thin, design: .rounded))
                .monospacedDigit()
                .contentTransition(.numericText())
            if let h = t.humidityPercent {
                Label("\(Int(h))%", systemImage: "humidity").foregroundStyle(.secondary)
            }
        }
    }

    private func modePicker(_ t: Thermostat) -> some View {
        Picker("Mode", selection: Binding(
            get: { t.mode },
            set: { store.setMode($0, on: t.id) }
        )) {
            ForEach(t.availableModes.isEmpty ? Thermostat.Mode.allCases : t.availableModes) { m in
                Text(m.label).tag(m)
            }
        }
        .pickerStyle(.segmented)
        .disabled(t.ecoOn)
    }

    @ViewBuilder
    private func setpoints(_ t: Thermostat) -> some View {
        if t.ecoOn {
            VStack(spacing: 6) {
                Label("Eco", systemImage: "leaf.fill").foregroundStyle(.green).font(.headline)
                Text("\(Temp.format(t.ecoHeatCelsius, t.scale)) – \(Temp.format(t.ecoCoolCelsius, t.scale))")
                    .foregroundStyle(.secondary)
                Text("Turn Eco off to change setpoints.").font(.footnote).foregroundStyle(.secondary)
            }
        } else if t.mode == .off {
            Text("System off").foregroundStyle(.secondary)
        } else {
            HStack(spacing: 32) {
                if t.editsHeat {
                    SetpointControl(title: "Heat to", tint: .orange,
                                    value: Temp.format(t.heatCelsius, t.scale, unit: false),
                                    onNudge: { store.nudge(.heat, by: $0, on: t.id) })
                }
                if t.editsCool {
                    SetpointControl(title: "Cool to", tint: .blue,
                                    value: Temp.format(t.coolCelsius, t.scale, unit: false),
                                    onNudge: { store.nudge(.cool, by: $0, on: t.id) })
                }
            }
        }
    }

    private func toggles(_ t: Thermostat) -> some View {
        VStack(spacing: 12) {
            Toggle(isOn: Binding(get: { t.ecoOn }, set: { store.setEco($0, on: t.id) })) {
                Label("Eco mode", systemImage: "leaf")
            }
            Toggle(isOn: Binding(get: { t.fanTimerOn }, set: { store.setFan($0, on: t.id) })) {
                Label("Fan (15 min)", systemImage: "fan")
            }
        }
        .padding()
        .background(.quaternary.opacity(0.4), in: RoundedRectangle(cornerRadius: 12))
    }

    private var footer: some View {
        Group {
            if let d = store.lastRefresh {
                Text("Updated \(d.formatted(date: .omitted, time: .standard))")
                    .font(.caption2).foregroundStyle(.tertiary)
            }
        }
    }

    // MARK: -

    private func statusColor(_ t: Thermostat) -> Color {
        switch t.hvacStatus {
        case .heating: return .orange
        case .cooling: return .blue
        case .off: return .gray
        }
    }

    private func statusText(_ t: Thermostat) -> String {
        switch t.hvacStatus {
        case .heating: return "Heating"
        case .cooling: return "Cooling"
        case .off: return t.mode == .off ? "Off" : "Idle"
        }
    }
}

struct SetpointControl: View {
    let title: String
    let tint: Color
    let value: String
    let onNudge: (Int) -> Void

    var body: some View {
        VStack(spacing: 8) {
            Text(title).font(.caption).foregroundStyle(.secondary)
            Text(value)
                .font(.system(size: 44, weight: .medium, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(tint)
                .contentTransition(.numericText())
            HStack(spacing: 16) {
                stepButton("minus") { onNudge(-1) }
                stepButton("plus") { onNudge(+1) }
            }
        }
    }

    private func stepButton(_ icon: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.title2.weight(.semibold))
                .frame(width: 52, height: 52)
                .background(tint.opacity(0.15), in: Circle())
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.increase, trigger: value)
    }
}
