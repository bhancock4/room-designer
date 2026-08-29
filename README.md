# Sectional Planner — Cascade Modular

Plan a Cascade Furniture modular sectional in your actual room before you buy.
The piece catalog is transcribed from the Cascade spec sheet (printed 10/11/2023):
5 sofas, 12 sectional pieces, 5 ottomans — with real dimensions, arm/back/open sides,
and L/R reversibility.

**Live app:** https://bhancock4.github.io/room-designer/

## Features

- **Room** — width/depth entered in feet + inches (fresh sessions start at 25′×25′);
  edit the room shape freely (drag walls or corners, double-click a wall to add a
  corner, ⌥-click a corner to delete) for L-shaped or irregular rooms. Corners snap
  square. Save a room + its fixed objects as a reusable **template** (File menu).
- **Pieces** — palette categorized like the spec sheet (Sofas / Sectionals / Ottos).
  Every piece shows its code, name, and dimensions; reversible pieces are marked ⇄.
- **Snap & connect** — drag or arrow-nudge a piece near a connectable (green dashed)
  side and both edges glow green; drop to connect. Connected pieces form a **unit**
  that moves, rotates, and reverses as one. Arms and backs refuse to connect, and
  shapes/objects never attach to couches (they only align). Overlaps tint red.
- **Total dimensions** — every multi-piece unit shows its overall bounding size and
  approximate seat count; room dimensions always visible. Toggle inches ⇄ ft+in.
- **Reverse** — `F` / `⌥Arrow` mirrors a reversible piece (11L ⇄ 11R) or an entire
  unit. Non-reversible pieces say why.
- **Rotation** — any angle. Couch pieces step 90° by default, shapes 22.5°; change
  defaults in ⚙ Settings or override per piece; one-click reset to 0°.
- **Objects** — regular polygons (choose sides; 4 = rectangle), circles (locked
  round), ovals, and doors; resize by dragging the corner anchor or typing exact
  dimensions; label anything.
- **Doorways** — doors render a floor-plan swing arc and keep a 32″ approach zone
  clear: green when clear, red "needs 32″ clear" when furniture blocks it. `F`
  flips the hinge side.
- **Clearance checker** — walkway gaps between units and walls are measured live:
  red under 24″, amber under 36″, green at 36″+. Toggle with 🚶.
- **Example configs** — the six configurations pre-drawn on the spec sheet load
  with one click, each verified by test to reproduce its printed dimensions.
- **Spec sheet PDF** — renders your configuration in the same layout as the store's
  spec sheet (piece cards with quantities and L/R status + room diagram + seat
  totals) and prints to PDF.
- **Themes** — cream, gray-blue, light purple, light green, and a blueprint look
  (white linework on deep blue), in ⚙ Settings.
- **View** — endless grid workspace; drag empty canvas to pan, scroll to zoom,
  or use the corner zoom control (− / % / + / fit).
- **Persistence** — autosaves to localStorage; named configurations and room
  templates under the File menu; JSON export/import; undo/redo.

## Hotkeys

| Key | Action |
| --- | --- |
| `Tab` / `Shift+Tab` | cycle units |
| click / double-click | select unit / single piece |
| drag empty canvas | pan (scroll wheel zooms) |
| arrows / `Shift`+arrows | nudge 1″ / 12″ (snaps & connects like dragging) |
| `R` / `Shift+R` or `Cmd+→` / `Cmd+←` (Ctrl on PC) | rotate CW / CCW by the piece's step |
| `F` or `Option+Arrow` | reverse (flip L↔R) |
| `U` | detach piece from unit |
| `D` | duplicate |
| `Delete` | remove |
| `⌘Z` / `⇧⌘Z` | undo / redo |
| `Esc` | drop selection / close dialogs |
| `?` | help |

## Development

```bash
npm install
npm run dev      # local dev server
npm test         # vitest unit tests
npm run build    # tests + typecheck + production build (tests gate the build)
```

Pushes to `main` run tests in GitHub Actions; only if they pass does the site
deploy to GitHub Pages. See `CLAUDE.md` for architecture notes and invariants.
