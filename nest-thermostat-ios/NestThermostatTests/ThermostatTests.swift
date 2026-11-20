import XCTest
@testable import NestThermostat

final class ThermostatTests: XCTestCase {

    /// Shape copied from the SDM devices.list reference response.
    static let fixture = """
    {
      "devices": [
        {
          "name": "enterprises/proj-123/devices/AVPHwEv-abc",
          "type": "sdm.devices.types.THERMOSTAT",
          "traits": {
            "sdm.devices.traits.Info": { "customName": "" },
            "sdm.devices.traits.Humidity": { "ambientHumidityPercent": 41 },
            "sdm.devices.traits.Connectivity": { "status": "ONLINE" },
            "sdm.devices.traits.Fan": { "timerMode": "OFF" },
            "sdm.devices.traits.ThermostatMode": { "mode": "HEAT", "availableModes": ["HEAT","COOL","HEATCOOL","OFF"] },
            "sdm.devices.traits.ThermostatEco": { "availableModes": ["OFF","MANUAL_ECO"], "mode": "OFF", "heatCelsius": 15.5, "coolCelsius": 26.5 },
            "sdm.devices.traits.ThermostatHvac": { "status": "HEATING" },
            "sdm.devices.traits.Settings": { "temperatureScale": "FAHRENHEIT" },
            "sdm.devices.traits.ThermostatTemperatureSetpoint": { "heatCelsius": 20.555555 },
            "sdm.devices.traits.Temperature": { "ambientTemperatureCelsius": 19.46 },
            "sdm.devices.traits.SomeFutureTrait": { "whatever": true }
          },
          "parentRelations": [ { "parent": "enterprises/proj-123/structures/s/rooms/r", "displayName": "Living Room" } ]
        },
        {
          "name": "enterprises/proj-123/devices/cam",
          "type": "sdm.devices.types.CAMERA",
          "traits": {}
        }
      ]
    }
    """

    func testDecodesThermostatAndSkipsCamera() throws {
        let list = try JSONDecoder().decode(SDMDeviceList.self, from: Data(Self.fixture.utf8))
        let stats = (list.devices ?? []).compactMap(Thermostat.init(device:))
        XCTAssertEqual(stats.count, 1)
        let t = stats[0]
        XCTAssertEqual(t.displayName, "Living Room")          // empty customName falls back to room
        XCTAssertEqual(t.mode, .heat)
        XCTAssertEqual(t.hvacStatus, .heating)
        XCTAssertEqual(t.scale, .fahrenheit)
        XCTAssertTrue(t.isOnline)
        XCTAssertFalse(t.ecoOn)
        XCTAssertEqual(t.humidityPercent, 41)
        XCTAssertEqual(t.heatCelsius ?? 0, 20.5555, accuracy: 0.001)
        XCTAssertEqual(t.availableModes, [.heat, .cool, .heatCool, .off])
        XCTAssertTrue(t.editsHeat); XCTAssertFalse(t.editsCool)
    }

    func testFahrenheitFormattingRoundsToWholeDegrees() {
        XCTAssertEqual(Temp.format(19.46, .fahrenheit), "67°F")     // 67.03
        XCTAssertEqual(Temp.format(20.5555, .fahrenheit), "69°F")   // 69.0
        XCTAssertEqual(Temp.format(nil, .fahrenheit), "--")
    }

    func testCelsiusFormattingUsesHalves() {
        XCTAssertEqual(Temp.format(20.3, .celsius), "20.5°C")
        XCTAssertEqual(Temp.format(21.0, .celsius), "21°C")
    }

    func testStepAndSnapInFahrenheit() {
        // 69°F + one tick = 70°F exactly, regardless of float noise in the input.
        let c = Temp.snap(20.5555 + Temp.step(.fahrenheit), .fahrenheit)
        XCTAssertEqual(Temp.toF(c), 70, accuracy: 1e-9)
    }

    func testClampKeepsNestRange() {
        XCTAssertEqual(Temp.clamp(5), Temp.minC)
        XCTAssertEqual(Temp.clamp(40), Temp.maxC)
        XCTAssertEqual(Temp.clamp(21), 21)
    }

    func testCommandEncoding() throws {
        let data = try JSONEncoder().encode(SDMCommand.setRange(heatCelsius: 20, coolCelsius: 24))
        let obj = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        XCTAssertEqual(obj["command"] as? String, "sdm.devices.commands.ThermostatTemperatureSetpoint.SetRange")
        let p = obj["params"] as! [String: Any]
        XCTAssertEqual(p["heatCelsius"] as? Double, 20)
        XCTAssertEqual(p["coolCelsius"] as? Double, 24)

        let fan = try JSONEncoder().encode(SDMCommand.setFanTimer(on: true, seconds: 900))
        let f = try JSONSerialization.jsonObject(with: fan) as! [String: Any]
        XCTAssertEqual((f["params"] as! [String: Any])["duration"] as? String, "900s")

        let eco = SDMCommand.setEco(true)
        XCTAssertEqual(eco.params["mode"], .string("MANUAL_ECO"))
    }

    func testReversedClientID() {
        let id = "1234567890-abc123.apps.googleusercontent.com"
        let reversed = id.split(separator: ".").reversed().joined(separator: ".")
        XCTAssertEqual(reversed, "com.googleusercontent.apps.1234567890-abc123")
    }
}
