import Foundation

// Wire types for the Smart Device Management API.
// https://developers.google.com/nest/device-access/traits

struct SDMDeviceList: Decodable {
    let devices: [SDMDevice]?
}

struct SDMDevice: Decodable {
    /// e.g. "enterprises/{project}/devices/{device}"
    let name: String
    /// e.g. "sdm.devices.types.THERMOSTAT"
    let type: String
    let traits: SDMTraits
    let parentRelations: [ParentRelation]?

    struct ParentRelation: Decodable {
        let parent: String
        let displayName: String?
    }

    static let thermostatType = "sdm.devices.types.THERMOSTAT"
}

/// Traits are keyed by their fully-qualified name. Unknown traits are ignored.
struct SDMTraits: Decodable {
    var info: Info?
    var temperature: Temperature?
    var humidity: Humidity?
    var connectivity: Connectivity?
    var thermostatMode: ThermostatMode?
    var thermostatHvac: ThermostatHvac?
    var setpoint: ThermostatTemperatureSetpoint?
    var eco: ThermostatEco?
    var settings: Settings?
    var fan: Fan?

    enum CodingKeys: String, CodingKey {
        case info = "sdm.devices.traits.Info"
        case temperature = "sdm.devices.traits.Temperature"
        case humidity = "sdm.devices.traits.Humidity"
        case connectivity = "sdm.devices.traits.Connectivity"
        case thermostatMode = "sdm.devices.traits.ThermostatMode"
        case thermostatHvac = "sdm.devices.traits.ThermostatHvac"
        case setpoint = "sdm.devices.traits.ThermostatTemperatureSetpoint"
        case eco = "sdm.devices.traits.ThermostatEco"
        case settings = "sdm.devices.traits.Settings"
        case fan = "sdm.devices.traits.Fan"
    }

    struct Info: Decodable { let customName: String? }
    struct Temperature: Decodable { let ambientTemperatureCelsius: Double? }
    struct Humidity: Decodable { let ambientHumidityPercent: Double? }
    struct Connectivity: Decodable { let status: String? }          // ONLINE | OFFLINE
    struct ThermostatMode: Decodable {
        let mode: String?                                            // HEAT | COOL | HEATCOOL | OFF
        let availableModes: [String]?
    }
    struct ThermostatHvac: Decodable { let status: String? }        // HEATING | COOLING | OFF
    struct ThermostatTemperatureSetpoint: Decodable {
        let heatCelsius: Double?
        let coolCelsius: Double?
    }
    struct ThermostatEco: Decodable {
        let mode: String?                                            // MANUAL_ECO | OFF
        let availableModes: [String]?
        let heatCelsius: Double?
        let coolCelsius: Double?
    }
    struct Settings: Decodable { let temperatureScale: String? }    // CELSIUS | FAHRENHEIT
    struct Fan: Decodable {
        let timerMode: String?                                       // ON | OFF
        let timerTimeout: String?                                    // RFC3339
    }
}

/// A command for `devices/{id}:executeCommand`.
struct SDMCommand: Encodable, Equatable {
    let command: String
    let params: [String: Param]

    enum Param: Encodable, Equatable {
        case string(String), number(Double)
        func encode(to encoder: Encoder) throws {
            var c = encoder.singleValueContainer()
            switch self {
            case .string(let s): try c.encode(s)
            case .number(let d): try c.encode(d)
            }
        }
    }

    // Thermostat mode. Setpoint commands are rejected unless the mode matches.
    static func setMode(_ mode: Thermostat.Mode) -> SDMCommand {
        .init(command: "sdm.devices.commands.ThermostatMode.SetMode",
              params: ["mode": .string(mode.rawValue)])
    }
    /// Requires mode == HEAT and eco OFF.
    static func setHeat(celsius: Double) -> SDMCommand {
        .init(command: "sdm.devices.commands.ThermostatTemperatureSetpoint.SetHeat",
              params: ["heatCelsius": .number(celsius)])
    }
    /// Requires mode == COOL and eco OFF.
    static func setCool(celsius: Double) -> SDMCommand {
        .init(command: "sdm.devices.commands.ThermostatTemperatureSetpoint.SetCool",
              params: ["coolCelsius": .number(celsius)])
    }
    /// Requires mode == HEATCOOL and eco OFF.
    static func setRange(heatCelsius: Double, coolCelsius: Double) -> SDMCommand {
        .init(command: "sdm.devices.commands.ThermostatTemperatureSetpoint.SetRange",
              params: ["heatCelsius": .number(heatCelsius), "coolCelsius": .number(coolCelsius)])
    }
    static func setEco(_ on: Bool) -> SDMCommand {
        .init(command: "sdm.devices.commands.ThermostatEco.SetMode",
              params: ["mode": .string(on ? "MANUAL_ECO" : "OFF")])
    }
    /// duration is ignored when turning the fan off. Max 43200s (12h).
    static func setFanTimer(on: Bool, seconds: Int = 900) -> SDMCommand {
        var p: [String: Param] = ["timerMode": .string(on ? "ON" : "OFF")]
        if on { p["duration"] = .string("\(seconds)s") }
        return .init(command: "sdm.devices.commands.Fan.SetTimer", params: p)
    }
}

struct SDMErrorEnvelope: Decodable {
    struct Inner: Decodable { let code: Int; let message: String; let status: String? }
    let error: Inner
}
