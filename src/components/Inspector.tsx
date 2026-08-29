import { defFor, displayCode, isReversible, unitSeats } from '../catalog'
import { fmtLen, bboxOf } from '../geometry'
import { pieceBBox, unitBBox, useStore } from '../store'

const STEP_OPTIONS = [1, 5, 10, 15, 22.5, 30, 45, 90, 180]

function stepOptionsWith(current: number): number[] {
  return STEP_OPTIONS.includes(current) ? STEP_OPTIONS : [...STEP_OPTIONS, current].sort((a, b) => a - b)
}

/** Feet + inches input pair for a length stored in inches. */
function FtInRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const ft = Math.floor(Math.round(value) / 12)
  const inch = Math.round(value) % 12
  const set = (f: number, i: number) => {
    const v = Math.max(24, f * 12 + i)
    if (v !== Math.round(value)) onChange(v)
  }
  return (
    <div className="row ftin-row">
      <span className="ftin-label">{label}</span>
      <label>
        ft
        <input type="number" min={2} value={ft} onChange={(e) => set(Math.max(0, Number(e.target.value) || 0), inch)} />
      </label>
      <label>
        in
        <input
          type="number"
          min={-1}
          max={12}
          value={inch}
          onChange={(e) => set(ft, Math.min(11, Math.max(0, Number(e.target.value) || 0)))}
        />
      </label>
    </div>
  )
}

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
        <FtInRow label="Width" value={roomBB.w} onChange={(v) => store.setRoomRect(v, roomBB.h)} />
        <FtInRow label="Depth" value={roomBB.h} onChange={(v) => store.setRoomRect(roomBB.w, v)} />
        <div className="hint">
          {F(roomBB.w)} × {F(roomBB.h)} · {room.length} corners
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
            Rotate step for this piece
            <select
              value={sel.rotStep ?? ''}
              onChange={(e) =>
                store.setPieceRotStep(sel.id, e.target.value === '' ? undefined : Number(e.target.value))
              }
            >
              <option value="">default ({sel.custom ? store.rotStepShapes : store.rotStepPieces}°)</option>
              {STEP_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}°
                </option>
              ))}
            </select>
          </label>
          {sel.rot !== 0 && (
            <div className="hint">
              Current angle: {sel.rot}°{' '}
              <button className="mini" onClick={() => store.resetRotation()} title="Rotate back to 0°">
                ↺ Reset to 0°
              </button>
            </div>
          )}
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
            pieces near a green dashed edge to snap &amp; connect · drag empty canvas to pan.
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">Rotation defaults</div>
        <div className="row">
          <label>
            Couch
            <select value={store.rotStepPieces} onChange={(e) => store.setRotSteps(Number(e.target.value), store.rotStepShapes)}>
              {stepOptionsWith(store.rotStepPieces).map((v) => (
                <option key={v} value={v}>
                  {v}°
                </option>
              ))}
            </select>
          </label>
          <label>
            Shapes
            <select value={store.rotStepShapes} onChange={(e) => store.setRotSteps(store.rotStepPieces, Number(e.target.value))}>
              {stepOptionsWith(store.rotStepShapes).map((v) => (
                <option key={v} value={v}>
                  {v}°
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="hint">R / ⌘-arrows rotate by these steps; override per piece above when one is selected.</div>
      </div>
    </div>
  )
}
