import { defFor, displayCode, isReversible, unitSeats } from '../catalog'
import { fmtLen, bboxOf } from '../geometry'
import { effectiveRotStep, pieceBBox, unitBBox, useStore } from '../store'

export default function Inspector() {
  const store = useStore()
  const { selectedId, room, editRoom } = store
  const scope = store.selectionScope()
  const sel = scope.find((p) => p.id === selectedId)
  const roomBB = bboxOf(room)
  const F = (v: number) => fmtLen(v, store.units)

  return (
    <div className="inspector">
      <div className="panel">
        <div className="panel-head">Room</div>
        <div className="row">
          <label>
            W (in)
            <input
              type="number"
              value={Math.round(roomBB.w)}
              min={24}
              onChange={(e) => store.setRoomRect(Number(e.target.value) || roomBB.w, roomBB.h)}
            />
          </label>
          <label>
            D (in)
            <input
              type="number"
              value={Math.round(roomBB.h)}
              min={24}
              onChange={(e) => store.setRoomRect(roomBB.w, Number(e.target.value) || roomBB.h)}
            />
          </label>
        </div>
        <div className="hint">
          {(roomBB.w / 12).toFixed(1)} ft × {(roomBB.h / 12).toFixed(1)} ft · {room.length} corners
        </div>
        <button className={editRoom ? 'primary' : ''} onClick={() => store.setEditRoom(!editRoom)}>
          {editRoom ? '✓ Done editing room' : '✎ Edit room shape'}
        </button>
      </div>

      {sel ? (
        <div className="panel">
          <div className="panel-head">
            {sel.custom ? 'Object' : `Piece ${displayCode(sel)}`}
            {scope.length > 1 && <span className="unit-badge">unit of {scope.length}</span>}
          </div>
          {!sel.custom && <div className="hint">{defFor(sel)?.name}{defFor(sel)?.note ? ` — ${defFor(sel)?.note}` : ''}</div>}
          <div className="hint">
            Piece: {F(pieceBBox(sel).w)} × {F(pieceBBox(sel).h)}
            {(defFor(sel)?.seats ?? 0) > 0 && <> · seats {defFor(sel)!.seats}</>}
            {scope.length > 1 && (
              <>
                <br />
                <b>
                  Unit total: {F(unitBBox(scope).w)} × {F(unitBBox(scope).h)} · ≈{unitSeats(scope)} seats
                </b>
              </>
            )}
          </div>
          <label className="stack">
            Label
            <input
              type="text"
              value={sel.label ?? ''}
              placeholder="e.g. coffee table, Dad's spot"
              onChange={(e) => store.setLabel(sel.id, e.target.value)}
            />
          </label>
          {sel.custom && (
            <div className="row">
              <label>
                W (in)
                <input
                  type="number"
                  value={sel.custom.w}
                  min={1}
                  onChange={(e) => store.setCustomDims(sel.id, Number(e.target.value) || 1, sel.custom!.d)}
                />
              </label>
              <label>
                D (in)
                <input
                  type="number"
                  value={sel.custom.d}
                  min={1}
                  onChange={(e) => store.setCustomDims(sel.id, sel.custom!.w, Number(e.target.value) || 1)}
                />
              </label>
              {sel.custom.kind === 'poly' && (
                <label>
                  Sides
                  <input
                    type="number"
                    min={3}
                    max={24}
                    value={sel.custom.sides ?? 4}
                    onChange={(e) => store.setCustomSides(sel.id, Number(e.target.value) || 4)}
                  />
                </label>
              )}
            </div>
          )}
          {sel.custom && <div className="hint">Drag the blue corner anchor on the canvas to resize.</div>}
          <label className="stack">
            Rotate step for this piece (°) — blank uses the default ({sel.custom ? store.rotStepShapes : store.rotStepPieces}°)
            <input
              type="number"
              min={1}
              max={180}
              step="any"
              value={sel.rotStep ?? ''}
              placeholder={String(effectiveRotStep(sel, store))}
              onChange={(e) =>
                store.setPieceRotStep(sel.id, e.target.value === '' ? undefined : Number(e.target.value))
              }
            />
          </label>
          <div className="btn-grid">
            <button onClick={() => store.rotateSelection(1)} title="Rotate 90° clockwise (R)">
              ⟳ Rotate
            </button>
            <button onClick={() => store.rotateSelection(-1)} title="Rotate counter-clockwise (Shift+R)">
              ⟲ Rotate
            </button>
            <button
              disabled={!isReversible(sel) && scope.length === 1}
              className={isReversible(sel) || scope.length > 1 ? 'rev-ok' : ''}
              onClick={() => store.reverseSelection()}
              title="Mirror the piece/unit (F)"
            >
              ⇄ Reverse
            </button>
            <button onClick={() => store.duplicateSelection()} title="Duplicate (D)">
              ⧉ Duplicate
            </button>
            {scope.length > 1 && (
              <button onClick={() => store.detachSelected()} title="Disconnect this piece from its unit (U)">
                ✂ Detach piece
              </button>
            )}
            <button className="danger" onClick={() => store.deleteSelection()} title="Delete (⌫)">
              ✕ Delete
            </button>
          </div>
          {!isReversible(sel) && scope.length === 1 && !sel.custom && (
            <div className="hint">This piece is symmetric or only made in one orientation — no L/R reverse.</div>
          )}
        </div>
      ) : (
        <div className="panel">
          <div className="panel-head">Nothing selected</div>
          <div className="hint">
            Click a piece to select its unit · ⌥-click or double-click for a single piece · Tab cycles units · drag
            pieces near a green dashed edge to snap &amp; connect · Space+drag pans.
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">Rotation defaults</div>
        <div className="row">
          <label>
            Couch (°)
            <input
              type="number"
              min={1}
              max={180}
              step="any"
              value={store.rotStepPieces}
              onChange={(e) => store.setRotSteps(Number(e.target.value), store.rotStepShapes)}
            />
          </label>
          <label>
            Shapes (°)
            <input
              type="number"
              min={1}
              max={180}
              step="any"
              value={store.rotStepShapes}
              onChange={(e) => store.setRotSteps(store.rotStepPieces, Number(e.target.value))}
            />
          </label>
        </div>
        <div className="hint">R / ⌘-arrows rotate by these steps; override per piece above when one is selected.</div>
      </div>
    </div>
  )
}
