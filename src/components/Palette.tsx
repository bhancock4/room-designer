import { useState } from 'react'
import { CATALOG } from '../catalog'
import { fmtLen } from '../geometry'
import { useStore } from '../store'
import PieceGlyph from './PieceGlyph'

function PolygonAdder() {
  const addCustom = useStore((s) => s.addCustom)
  const [sides, setSides] = useState(4)
  const pts = Array.from({ length: Math.max(3, sides) }, (_, i) => {
    const t = ((i / Math.max(3, sides)) * 360 - 90 + 180 / Math.max(3, sides)) * (Math.PI / 180)
    return `${20 + 15 * Math.cos(t)},${15 + 11 * Math.sin(t)}`
  }).join(' ')
  return (
    <div className="poly-adder">
      <button
        className="object-btn"
        onClick={() => addCustom({ kind: 'poly', w: 36, d: 36, sides })}
        title="Add a regular polygon (4 sides = rectangle); resize by dragging its corner anchor"
      >
        <svg width={40} height={30}>
          <polygon points={pts} fill="#dfe9ef" stroke="#4a3f35" />
        </svg>
        <small>Polygon</small>
      </button>
      <label className="sides-label">
        sides
        <input
          type="number"
          min={3}
          max={24}
          value={sides}
          onChange={(e) => setSides(Math.min(24, Math.max(3, Number(e.target.value) || 4)))}
        />
      </label>
    </div>
  )
}

const SECTIONS: { key: 'SOFAS' | 'SECTIONALS' | 'OTTOS'; label: string }[] = [
  { key: 'SOFAS', label: 'Sofas' },
  { key: 'SECTIONALS', label: 'Sectionals' },
  { key: 'OTTOS', label: 'Ottos' },
]

const OBJECTS: { label: string; c: { kind: 'ellipse' | 'door'; w: number; d: number } }[] = [
  { label: 'Circle', c: { kind: 'ellipse', w: 36, d: 36 } },
  { label: 'Oval', c: { kind: 'ellipse', w: 48, d: 30 } },
  { label: 'Door', c: { kind: 'door', w: 32, d: 5 } },
]

export default function Palette() {
  const addPiece = useStore((s) => s.addPiece)
  const addCustom = useStore((s) => s.addCustom)
  const units = useStore((s) => s.units)
  const F = (v: number) => fmtLen(v, units)
  return (
    <div className="palette">
      {SECTIONS.map((sec) => (
        <div key={sec.key}>
          <div className="palette-head">{sec.label}</div>
          {CATALOG.filter((d) => d.category === sec.key).map((d) => (
            <button key={d.id} className="palette-item" onClick={() => addPiece(d.id)} title={d.note ?? d.name}>
              <PieceGlyph shape={d.shape} />
              <span className="palette-info">
                <b>
                  {d.code} — {d.name}
                  {d.reversible && <span className="rev-badge" title="Reversible: available in L and R">⇄</span>}
                </b>
                <small>
                  {F(d.w)} × {F(d.d)}
                </small>
              </span>
            </button>
          ))}
        </div>
      ))}
      <div>
        <div className="palette-head">Objects</div>
        <div className="objects-row">
          <PolygonAdder />
          {OBJECTS.map((o) => (
            <button key={o.label} className="object-btn" onClick={() => addCustom(o.c, o.label)}>
              {o.c.kind === 'door' ? (
                <svg width={40} height={30}>
                  <rect x={7} y={3} width={20} height={4} fill="#fff" stroke="#4a3f35" />
                  <path d="M27 8 A 20 20 0 0 1 7 28" fill="none" stroke="#6b5f52" strokeDasharray="3 2" />
                  <line x1={7} y1={8} x2={7} y2={28} stroke="#4a3f35" />
                </svg>
              ) : o.c.kind === 'ellipse' ? (
                <svg width={40} height={30}>
                  <ellipse cx={20} cy={15} rx={17} ry={o.c.w === o.c.d ? 12 : 10} fill="#dfe9ef" stroke="#4a3f35" />
                </svg>
              ) : (
                <svg width={40} height={30}>
                  <rect
                    x={o.c.w === o.c.d ? 8 : 3}
                    y={3}
                    width={o.c.w === o.c.d ? 24 : 34}
                    height={24}
                    fill="#dfe9ef"
                    stroke="#4a3f35"
                  />
                </svg>
              )}
              <small>{o.label}</small>
            </button>
          ))}
        </div>
        <div className="palette-note">
          Objects stand in for tables, rugs, etc. — label &amp; resize them in the side panel. Doors keep a 32″ swing
          zone clear (turns red when blocked); reverse (F) flips the hinge.
        </div>
      </div>
    </div>
  )
}
