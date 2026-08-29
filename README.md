# Sectional Planner — Cascade Modular

Plan a Cascade Furniture modular sectional in your actual room before you buy.
The piece catalog is transcribed from the Cascade spec sheet (printed 10/11/2023):
5 sofas, 12 sectional pieces, 5 ottomans — with real dimensions, arm/back/open sides,
and L/R reversibility.

**Live app:** https://bhancock4.github.io/room-designer/

## Features

- **Room** — set width/depth in inches; edit the room shape freely (drag walls or
  corners, double-click a wall to add a corner, ⌥-click a corner to delete) for
  L-shaped or irregular rooms. Corners snap square.
- **Pieces** — palette categorized like the spec sheet (Sofas / Sectionals / Ottos).
  Every piece shows its code, name, and dimensions; reversible pieces are marked ⇄.
- **Snap & connect** — drag a piece near a connectable (green dashed) side and both
  edges glow green; drop to connect. Connected pieces form a **unit** that moves,
  rotates, and reverses as one. Arms and backs refuse to connect (couches don't work
  that way). Overlapping pieces tint red.
- **Total dimensions** — every multi-piece unit shows its overall bounding size;
  room dimensions always visible. Toggle between inches and feet+inches.
- **Reverse** — `F` or the Reverse button mirrors a reversible piece (11L ⇄ 11R) or
  an entire unit. Non-reversible pieces say why.
- **Objects** — squares, rectangles, circles, ovals as stand-ins for tables, rugs,
  doors; resizable and labelable.
- **Spec sheet PDF** — one click renders your configuration in the same layout as
  the store's spec sheet (piece cards with quantities and L/R status + room diagram)
  and prints to PDF.
- **Persistence** — autosaves to localStorage; named saves; JSON export/import;
  undo/redo.
- **Sheet presets** — all six configurations pre-drawn on the spec sheet load with
  one click, each verified by test to reproduce its printed overall dimensions.
- **Seat counts** — every unit and the whole config show approximate seating
  capacity (chaise/cuddler counted).
- **Clearance checker** — walkway gaps between units and walls are measured live:
  red under 24″, amber under 36″, green at 36″+. Toggle with 🚶.
- **Doorways** — a Door object (Objects palette) renders a floor-plan swing arc and
  keeps a 32″ approach zone clear: green when clear, red "needs 32″ clear" when
  furniture blocks it. `F` flips the hinge side; width is editable.
- **Angled seats** — the corner wedge and cuddler draw their diagonal seat fronts
  so orientation reads at a glance.

## Hotkeys

| Key | Action |
| --- | --- |
| `Tab` / `Shift+Tab` | cycle units |
| click / double-click | select unit / single piece |
| arrows / `Shift`+arrows | nudge 1″ / 12″ |
| `R` / `Shift+R` | rotate 90° CW / CCW |
| `F` | reverse (flip L↔R) |
| `U` | detach piece from unit |
| `D` | duplicate |
| `Delete` | remove |
| `⌘Z` / `⇧⌘Z` | undo / redo |
| `?` | help |

## Development

```bash
npm install
npm run dev      # local dev server
npm test         # vitest unit tests
npm run build    # tests + typecheck + production build (tests gate the build)
```

Pushes to `main` run tests in GitHub Actions; only if they pass does the site
deploy to GitHub Pages.
