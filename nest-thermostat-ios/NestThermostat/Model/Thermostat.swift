import Foundation

/// App-facing view of one thermostat, flattened from SDM traits.
struct Thermostat: Identifiable, Equatable {
    enum Mode: String, CaseIterable, Identifiable {
        case heat = "HEAT", cool = "COOL", heatCool = "HEATCOOL", off = "OFF"
        var id: String { rawValue }
        var label: String {
            switch self {
            case .heat: return "Heat"
            case .cool: return "Cool"
            case .heatCool: return "Heat•Cool"
            case .off: return "Off"
            }
        }
    }
    enum HvacStatus: String { case heating = "HEATING", cooling = "COOLING", off = "OFF" }
    enum Scale: String { case celsius = "CELSIUS", fahrenheit = "FAHRENHEIT" }

    /// SDM resource name; used for every API call.
    let id: String
    var displayName: String
    var isOnline: Bool
    var ambientCelsius: Double?
    var humidityPercent: Double?
    var mode: Mode
    var availableModes: [Mode]
    var hvacStatus: HvacStatus
    var heatCelsius: Double?
    var coolCelsius: Double?
    var ecoOn: Bool
    var ecoHeatCelsius: Double?
    var ecoCoolCelsius: Double?
    var scale: Scale
    var fanTimerOn: Bool

    /// Returns nil for non-thermostat devices (cameras, doorbells...).
    init?(device d: SDMDevice) {
        guard d.type == SDMDevice.thermostatType else { return nil }
        let t = d.traits
        id = d.name
        let custom = t.info?.customName?.trimmingCharacters(in: .whitespaces) ?? ""
        let room = d.parentRelations?.first?.displayName ?? ""
        displayName = !custom.isEmpty ? custom : (!room.isEmpty ? room : "Thermostat")
        isOnline = t.connectivity?.status == "ONLINE"
        ambientCelsius = t.temperature?.ambientTemperatureCelsius
        humidityPercent = t.humidity?.ambientHumidityPercent
        mode = Mode(rawValue: t.thermostatMode?.mode ?? "") ?? .off
        availableModes = (t.thermostatMode?.availableModes ?? []).compactMap(Mode.init(rawValue:))
        hvacStatus = HvacStatus(rawValue: t.thermostatHvac?.status ?? "") ?? .off
        heatCelsius = t.setpoint?.heatCelsius
        coolCelsius = t.setpoint?.coolCelsius
        ecoOn = t.eco?.mode == "MANUAL_ECO"
        ecoHeatCelsius = t.eco?.heatCelsius
        ecoCoolCelsius = t.eco?.coolCelsius
        scale = Scale(rawValue: t.settings?.temperatureScale ?? "") ?? .fahrenheit
        fanTimerOn = t.fan?.timerMode == "ON"
    }

    /// Setpoints the user can edit in the current mode (nil when nothing is editable).
    var editsHeat: Bool { !ecoOn && (mode == .heat || mode == .heatCool) }
    var editsCool: Bool { !ecoOn && (mode == .cool || mode == .heatCool) }
}

/// Celsius <-> display conversions. The API is Celsius-only; the Nest UI steps
/// in whole °F or half °C, so we snap to those grids.
enum Temp {
    static func toF(_ c: Double) -> Double { c * 9 / 5 + 32 }
    static func toC(_ f: Double) -> Double { (f - 32) * 5 / 9 }

    /// One UI "tick" expressed in Celsius.
    static func step(_ scale: Thermostat.Scale) -> Double {
        scale == .fahrenheit ? 5.0 / 9.0 : 0.5
    }

    /// Snap a Celsius value to the display grid (whole °F or 0.5 °C).
    static func snap(_ c: Double, _ scale: Thermostat.Scale) -> Double {
        switch scale {
        case .fahrenheit: return toC(toF(c).rounded())
        case .celsius: return (c * 2).rounded() / 2
        }
    }

    static func format(_ c: Double?, _ scale: Thermostat.Scale, unit: Bool = true) -> String {
        guard let c else { return "--" }
        switch scale {
        case .fahrenheit: return "\(Int(toF(c).rounded()))" + (unit ? "°F" : "°")
        case .celsius:
            let v = (c * 2).rounded() / 2
            let s = v == v.rounded() ? "\(Int(v))" : String(format: "%.1f", v)
            return s + (unit ? "°C" : "°")
        }
    }

    /// Nest accepts roughly 9–32 °C (48–90 °F). Clamp before sending.
    static let minC = 9.0
    static let maxC = 32.0
    static func clamp(_ c: Double) -> Double { min(max(c, minC), maxC) }
}
