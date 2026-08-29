import { useMemo } from 'react'
import { CATALOG, catalogById, displayCode, shapeFor } from '../catalog'
import { bboxOf, fmtLen, mirrorShape } from '../geometry'
import { pieceBBox, unitBBox, useStore } from '../store'
import { components } from '../connect'
import { worldShape } from '../geometry'
import PieceGlyph from './PieceGlyph'

/** Printable sheet mimicking the Cascade spec-sheet layout, filled with the current config. */
export default function SpecSheet({ onClose }: { onClose: () => void }) {
  const { pieces, connections, room, units: unitMode } = useStore()
  const F = (v: number) => fmtLen(v, unitMode)

  const counts = useMemo(() => {
    const m = new Map<string, { defId: string; code: string; qty: number; reversedFromSheet: boolean }>()
    for (const p of pieces) {
      if (!p.defId) continue
      const code = displayCode(p)
      const key = `${p.defId}:${code}`
      const cur = m.get(key) ?? { defId: p.defId, code, qty: 0, reversedFromSheet: p.reversed }
      cur.qty++
      m.set(key, cur)
    }
    return m
  }, [pieces])

  const customs = pieces.filter((p) => p.custom)
  const units = components(pieces.map((p) => p.id), connections).map((ids) =>
    pieces.filter((p) => ids.includes(p.id)),
  )
  const roomBB = bboxOf(room)

  const sections: { key: 'SOFAS' | 'SECTIONALS' | 'OTTOS'; label: string }[] = [
    { key: 'SOFAS', label: 'S O F A S' },
    { key: 'SECTIONALS', label: 'S E C T I O N A L S' },
    { key: 'OTTOS', label: 'O T T O S' },
  ]

  // static room diagram
  const DIAG_W = 700
  const DIAG_H = Math.min(520, (DIAG_W * roomBB.h) / roomBB.w)
  const dscale = Math.min((DIAG_W - 80) / roomBB.w, (DIAG_H - 60) / roomBB.h)
  const dx = (x: number) => (x - roomBB.x) * dscale + 50
  const dy = (y: number) => (y - roomBB.y) * dscale + 40

  return (
    <div className="spec-overlay">
      <div className="spec-toolbar no-print">
        <button className="primary" onClick={() => window.print()}>
          🖨 Print / Save as PDF
        </button>
        <button onClick={onClose}>Close</button>
      </div>
      <div className="spec-sheet" id="spec-sheet">
        <header className="spec-header">
          <div>
            <h1>CASCADE</h1>
            <div className="spec-sub">FURNITURE&ensp;|&ensp;MATTRESS&ensp;|&ensp;DESIGN</div>
          </div>
          <div className="spec-meta">
            <div>Sectional Configuration</div>
            <div>Printed: {new Date().toLocaleDateString()}</div>
          </div>
        </header>
        <div className="spec-band">
          <span>PIECES</span>
          <span className="spec-band-right">Sofa Height: 38″&ensp;Seat Height: 22″&ensp;Seat Depth: 25″&ensp;Arm Height: 26″</span>
        </div>

        {sections.map((sec) => {
          const rows = CATALOG.filter(
            (d) => d.category === sec.key && [...counts.values()].some((c) => c.defId === d.id),
          )
          if (!rows.length) return null
          return (
            <div className="spec-section" key={sec.key}>
              <div className="spec-rail">{sec.label}</div>
              <div className="spec-cards">
                {rows.map((d) => {
                  const variants = [...counts.values()].filter((c) => c.defId === d.id)
                  return variants.map((v) => (
                    <div className="spec-card" key={v.code}>
                      <div className="spec-card-title">
                        {v.code} — {d.name}
                        {d.reversible && ' *'}
                      </div>
                      <div className="spec-card-dims">
                        L: {F(d.w)} × D: {F(d.d)}
                      </div>
                      <PieceGlyph shape={v.reversedFromSheet ? mirrorForDisplay(d.id) : d.shape} w={92} h={58} />
                      <div className="spec-qty">Qty: {v.qty}</div>
                      {v.reversedFromSheet && <div className="spec-revnote">reversed from sheet ({d.code} → {v.code})</div>}
                    </div>
                  ))
                })}
              </div>
            </div>
          )
        })}

        {customs.length > 0 && (
          <div className="spec-section">
            <div className="spec-rail">O B J E C T S</div>
            <div className="spec-cards">
              {customs.map((p) => (
                <div className="spec-card" key={p.id}>
                  <div className="spec-card-title">{p.label || (p.custom!.kind === 'rect' ? 'Box' : 'Oval')}</div>
                  <div className="spec-card-dims">
                    L: {F(p.custom!.w)} × D: {F(p.custom!.d)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="spec-note">* Available in both Left and Right configurations</div>
        <div className="spec-band">
          <span>CONFIGURATIONS</span>
          <span className="spec-band-right">
            Room: {F(roomBB.w)} × {F(roomBB.h)} ({(roomBB.w / 12).toFixed(1)} × {(roomBB.h / 12).toFixed(1)} ft)
          </span>
        </div>

        <svg width={DIAG_W} height={DIAG_H} className="spec-diagram">
          <path
            d={room.map((p, i) => `${i ? 'L' : 'M'}${dx(p.x)},${dy(p.y)}`).join(' ') + ' Z'}
            fill="#fdfcf8"
            stroke="#3d342b"
            strokeWidth={2.5}
          />
          {pieces.map((p) => {
            const pts = worldShape(p, shapeFor(p)).pts
            const bb = pieceBBox(p)
            return (
              <g key={p.id}>
                <path
                  d={pts.map((q, i) => `${i ? 'L' : 'M'}${dx(q.x)},${dy(q.y)}`).join(' ') + ' Z'}
                  fill={p.custom ? '#e8eff3' : '#f3ecdc'}
                  stroke="#4a3f35"
                  strokeWidth={1.2}
                />
                <text x={dx(bb.x + bb.w / 2)} y={dy(bb.y + bb.h / 2)} textAnchor="middle" fontSize={11} fontWeight={700}>
                  {displayCode(p)}
                </text>
              </g>
            )
          })}
          {units
            .filter((u) => u.length > 1)
            .map((u, i) => {
              const bb = unitBBox(u)
              return (
                <g key={i} stroke="#6b6156" fill="#6b6156" strokeWidth={1}>
                  <line x1={dx(bb.x)} y1={dy(bb.y) - 10} x2={dx(bb.x + bb.w)} y2={dy(bb.y) - 10} />
                  <text x={dx(bb.x + bb.w / 2)} y={dy(bb.y) - 14} textAnchor="middle" fontSize={11} stroke="none">
                    {F(bb.w)}
                  </text>
                  <line x1={dx(bb.x) - 10} y1={dy(bb.y)} x2={dx(bb.x) - 10} y2={dy(bb.y + bb.h)} />
                  <text
                    x={dx(bb.x) - 14}
                    y={dy(bb.y + bb.h / 2)}
                    textAnchor="middle"
                    fontSize={11}
                    stroke="none"
                    transform={`rotate(-90 ${dx(bb.x) - 14} ${dy(bb.y + bb.h / 2)})`}
                  >
                    {F(bb.h)}
                  </text>
                </g>
              )
            })}
        </svg>

        <div className="spec-units">
          {units
            .filter((u) => u.length > 1)
            .map((u, i) => {
              const bb = unitBBox(u)
              return (
                <div key={i}>
                  <b>Unit {i + 1}:</b> {u.map((p) => displayCode(p)).join(' + ')} — overall {F(bb.w)} × {F(bb.h)}
                </div>
              )
            })}
        </div>
        <footer className="spec-footer">Dimensions are approximate and subject to change.</footer>
      </div>
    </div>
  )
}

function mirrorForDisplay(defId: string) {
  return mirrorShape(catalogById.get(defId)!.shape)
}
