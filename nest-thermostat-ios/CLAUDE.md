# CLAUDE.md

Personal iOS app (SwiftUI, iOS 17, no third-party deps) to control the owner's
Nest thermostat after Google retires the Nest app on 2027-01-25. Single user,
sideloaded, never shipping to the App Store. Read README.md for Google setup.

## Status

Scaffold only. **Nothing here has been compiled** — it was written in a Linux
container with no Xcode. First job in any session with Xcode: `xcodegen`, build,
fix compiler errors, run the tests (cmd-U).

## Facts already established (do not re-research)

- Device: Nest software 6.5-14 => 3rd gen Learning Thermostat or Thermostat E.
- That hardware has **no local API and will never get Matter**. Google's cloud
  (Smart Device Management / SDM API) is the only way to reach it. Home
  Assistant's Nest integration uses the same cloud API.
- SDM API limits that matter for the owner's feature requests:
  - **Nest Temperature Sensors (the remote pucks) are not exposed.** Only the
    thermostat's own ambient temperature and humidity are readable.
  - **There is no schedule API.** The thermostat's built-in schedule keeps
    running but can't be read or edited. Any schedule we build must fire
    setpoint commands itself from something that is awake at the right time.
  - Setpoint commands are rate-limited per device (HTTP 429). Debounce writes.

## Owner's requested features

1. Core control: ambient temp, mode, setpoints, eco, fan. (scaffolded)
2. Read temperature sensors.
3. Set a schedule.

## Open decision — confirm with the owner before building 2 and 3

Two paths were discussed. The owner has not explicitly picked one.

**A. Keep the Nest, use Google's SDM API (what is scaffolded).**
- Sensors: thermostat ambient + humidity only. Remote pucks impossible.
- Schedule: store it in the app, fire it via App Intents + a Shortcuts
  time-of-day automation (phone must be on with network), or via a tiny
  always-on scheduler elsewhere. Not as robust as the device's own schedule.

**B. Replace the Nest with an ESP32 running ESPHome (fully local, no Google).**
- ESP32 wired to the 24V HVAC terminals (needs a C wire), opto-isolated relay
  board, DS18B20 probes. ESPHome `thermostat` climate + `web_server` v3
  (REST + SSE on the LAN).
- Sensors: any number of wired probes, all readable.
- Schedule: lives on the ESP (4 periods x weekday/weekend as `datetime` +
  `number` entities); the app only edits it. Fires with the phone off.
- App changes: delete `Auth/` and `API/`, add a local HTTP+SSE client and
  Bonjour discovery. `Model/`, `Store/`, `Views/` mostly carry over.
- Build mock-first: a local simulator speaking the ESPHome REST/SSE contract so
  the app is fully usable before any hardware is wired.

## Conventions

- Celsius on the wire and in the model; convert only at the display edge
  (`Temp` in Model/Thermostat.swift). Snap to whole degF / half degC.
- Commands are optimistic, then re-read from the device to show the truth.
- Secrets live in `Secrets.xcconfig` (gitignored). Never commit ids or tokens.
- Tests pin real behaviour (decoding, rounding, command JSON). No UI tests.
