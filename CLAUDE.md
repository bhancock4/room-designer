# CLAUDE.md

Room/sectional planner for a Cascade Furniture modular couch purchase. The owner is
sizing an expensive sectional for a real room — **dimensional accuracy is the whole
point**. When in doubt, prefer exact inches over convenience.

## Source of truth

`src/catalog.ts` is a transcription of the physical Cascade spec sheet (printed
10/11/2023). Piece codes, names, L×D dimensions, seat counts, and which sides are
arms/backs/open all come from that sheet. Do not "improve" these numbers.

Known approximations (not printed on the sheet — flag before relying on them):
- Chaise footprint width on sofa-chaise pieces: 30″ (`CHAISE_W`)
- The 75R angled-cuddler polygon and the wedge/cuddler decor lines
- Seat counts (derived from seat widths, ~24″/adult)

The hand-marked "AS SHOWN" config is 10L + 32 + 21R = exactly 168″ × 107″ and is
both the default layout and a regression test.

## Commands

```bash
npm run dev        # vite dev server
npm test           # vitest (also: npx vitest run src/foo.test.ts)
npm run build      # vitest + tsc --noEmit + vite build — tests gate the build
```

CI (`.github/workflows/deploy.yml`): push to `main` → tests → build → GitHub Pages
at `/room-designer/` (the vite `base`). Never push with failing tests.

## Architecture (all under src/)

| File | Responsibility |
| --- | --- |
| `types.ts` | Core types. `Placed` = a piece instance; `Shape` = polygon + per-edge kinds + decor polylines |
| `catalog.ts` | Piece definitions, custom-object shapes (poly/ellipse/door), door keep-clear zone, seat counts, display codes |
| `geometry.ts` | Shape transforms (mirror/rotate/world), bbox, polygon overlap, formatting (`fmtLen`) |
| `connect.ts` | Edge snapping (`findSnap`, `findWallSnap`), connected components (units) |
| `clearance.ts` | Walkway gap measurement between unit bboxes and walls |
| `store.ts` | Zustand store: pieces/room/connections + history, selection, rotation steps, settings, `newId` |
| `presets.ts` | The six sheet configurations, each tested against its printed overall dims |
| `themes.ts` | Canvas color themes — **never hardcode canvas colors in components; add to the theme table** |
| `storage.ts` | localStorage autosave, named saves, room templates, JSON import/export |
| `components/Canvas.tsx` | All rendering + pointer interaction (drag, snap, pan, zoom, resize anchors, room editing) |
| `components/Inspector.tsx` | Right panel: room dims (ft+in), selected-piece controls |
| `components/Palette.tsx` | Left panel: catalog + objects |
| `components/SpecSheet.tsx` | Printable sheet mimicking the store's layout (`@media print` in App.css) |

## Invariants — breaking these breaks distant features

- **Units are inches.** UI may format as ft+in (`fmtLen`), storage never converts.
- **Canonical shape space**: y-down, back edge at top, polygon points **clockwise**;
  `kinds[i]` describes edge `pts[i] → pts[i+1]` as `back | arm | front | open`.
  Only `open` edges initiate snap-connects; T-joins allow one non-open side.
- **`Placed.x/y` is the world bbox top-left** after mirror+rotate normalization.
  `rot` is degrees clockwise, any angle; multiples of 90 take an exact integer path
  in `rotateShape` (tests assert zero float drift — keep that fast path).
- **`reversed` mirrors the canonical shape** and flips the L/R suffix in
  `displayCode`. Reversing a whole unit = mirror about the unit bbox axis.
- **Units (couch assemblies) are connected components** of `connections`. Only
  catalog pieces may connect — `store.connect()` refuses customs; keep it that way.
- **Overlay layers** (dimension lines, gaps, zones, hints) must have
  `pointerEvents="none"` or they steal clicks from pieces.
- Use `safeCapture` for pointer capture (raw `setPointerCapture` throws on
  synthetic/stale pointers and aborts React handlers).
- History: call `store.push()` once per user gesture *before* mutating (drags push
  on first movement via a `pushed` flag).

## Persistence keys

All localStorage keys are prefixed `couch-planner:v1:` (`auto`, `saves`, `rooms`,
`units`, `clearance`, `rotPieces`, `rotShapes`, `theme`). Bump the prefix if the
snapshot schema breaks backward compatibility — old saves must not crash the app.

## Testing philosophy

Meaningful tests, not coverage theater. The valuable ones assert real-world truths:
sheet dimensions, preset overall sizes (168×107 etc.), snap geometry, door-zone
transforms under rotation, circles staying round. When adding a feature that has
geometry, add a test that pins the numbers. UI wiring is verified by hand/browser.

## UX conventions

- Selection: click = unit, double-click/⌥ = solo piece; solo transforms detach.
- Keyboard map lives in `HOTKEYS` (App.tsx) **and** README — update both.
- New settings go in the ⚙ modal; per-piece overrides go in the Inspector.
- The spec-sheet view must keep printing cleanly in light colors regardless of
  canvas theme.
