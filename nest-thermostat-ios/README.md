# Nest Thermostat (iOS)

A personal SwiftUI app that controls Nest thermostats directly through Google's
**Smart Device Management (SDM) API**. No Nest app, no Google Home app.

Why this exists: Google retires the Nest app on **January 25, 2027**. The SDM API
is a separate, still-supported developer surface that every current Nest
thermostat model speaks.

> **Hard limit, read first:** 1st- and 2nd-gen Nest Learning Thermostats lost
> cloud/remote control in October 2025. The SDM API cannot reach them. Nothing
> here (or anywhere) will make those remote-controllable again. If yours is
> 3rd gen, 4th gen, Nest Thermostat (2020) or Thermostat E, you're fine.

## What's in the box

```
project.yml                     XcodeGen spec -> NestThermostat.xcodeproj
Secrets.xcconfig.example        copy to Secrets.xcconfig, fill in ids (gitignored)
NestThermostat/
  NestThermostatApp.swift       @main
  Config/AppConfig.swift        reads ids from Info.plist (fed by the xcconfig)
  Auth/GoogleAuth.swift         OAuth via Partner Connections Manager + PKCE, token refresh
  Auth/Keychain.swift           token storage
  API/SDMModels.swift           device/trait wire types, command builders
  API/SDMClient.swift           list devices, get device, executeCommand
  Model/Thermostat.swift        flattened thermostat + °C/°F helpers
  Store/ThermostatStore.swift   polling, optimistic + debounced commands
  Views/                        sign-in, list, thermostat screen
NestThermostatTests/            decoding, formatting, command-encoding tests
```

## One-time Google setup (~20 min, $5)

1. **Device Access registration** — https://console.nest.google.com/device-access
   Accept the terms, pay the one-time US$5 fee.
2. **Google Cloud project** — https://console.cloud.google.com
   - Enable the **Smart Device Management API**.
   - OAuth consent screen: External, add yourself as a test user. Heads-up:
     while the app is in "Testing", Google expires refresh tokens after 7 days,
     so you'd re-sign-in weekly. Pushing it to "In production" fixes that; since
     `sdm.service` is a sensitive scope you'll see an "unverified app" warning
     on sign-in (Advanced → continue). Annoying once, fine forever.
   - Credentials → Create OAuth client → type **iOS**. Bundle id must match
     `APP_BUNDLE_ID` below. Note the client id and the reversed client id.
3. **Device Access project** — back in the Device Access console, create a
   project, paste the OAuth client id, enable events if you want (not used yet).
   Copy the project id (a UUID).
4. **Secrets** — `cp Secrets.xcconfig.example Secrets.xcconfig` and fill in:
   `SDM_PROJECT_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_REVERSED_CLIENT_ID`,
   `APP_BUNDLE_ID`, `DEVELOPMENT_TEAM`.

## Build

```bash
brew install xcodegen
cd nest-thermostat-ios
xcodegen            # produces NestThermostat.xcodeproj
open NestThermostat.xcodeproj
```

Pick your iPhone, run. First launch opens Google's consent flow in a sheet where
you pick which thermostats to share. Tokens land in the Keychain; the refresh
token keeps you signed in.

Tests: ⌘U in Xcode. They don't need network or credentials.

## How it talks to the thermostat

| Action | SDM command |
| --- | --- |
| Mode | `ThermostatMode.SetMode` (HEAT / COOL / HEATCOOL / OFF) |
| Setpoint | `ThermostatTemperatureSetpoint.SetHeat` / `SetCool` / `SetRange` |
| Eco | `ThermostatEco.SetMode` (MANUAL_ECO / OFF) |
| Fan | `Fan.SetTimer` |

Rules the API enforces (and the UI mirrors):
- Setpoint commands are rejected unless the mode matches (SetHeat needs HEAT, etc.).
- Setpoints can't be changed while Eco is on.
- Everything is Celsius on the wire. The app snaps to whole °F / half °C like the
  Nest UI does.
- Setpoint commands are rate-limited per device. Taps are debounced (800 ms) and
  applied optimistically, then the device is re-read to show what it actually did.
- State is polled every 30 s while foregrounded. SDM also offers Pub/Sub push
  events; wiring those up is the obvious next step if polling feels laggy.

## Known unknowns / things to verify on device

- **PKCE through PCM.** The auth URL goes through Google's Partner Connections
  Manager, which should pass `code_challenge` through to accounts.google.com. If
  the token exchange fails with `invalid_grant`, flip `GoogleAuth.usePKCE` to
  `false` first. iOS OAuth clients have no secret, so PKCE is the only thing
  protecting the code exchange; keep it on if it works.
- **HEATCOOL deadband.** The store keeps heat/cool ≥1.5 °C apart. Nest's real
  minimum may differ by model; the device will tell you via a 400.
- **Temperature range** is clamped to 9–32 °C. Check against your model's limits.

## Next steps worth doing

1. Lock-screen / home-screen widget (WidgetKit) showing ambient + setpoint.
2. Pub/Sub event subscription instead of polling.
3. Siri Shortcuts / App Intents ("set the house to 68").
4. A schedule editor — SDM has **no schedule API**, so this would have to live
   on-phone and fire setpoint commands itself (background execution limits apply).
