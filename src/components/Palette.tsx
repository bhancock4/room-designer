import { CATALOG } from '../catalog'
import { fmtLen } from '../geometry'
import { useStore } from '../store'
import PieceGlyph from './PieceGlyph'

const SECTIONS: { key: 'SOFAS' | 'SECTIONALS' | 'OTTOS'; label: string }[] = [
  { key: 'SOFAS', label: 'Sofas' },
  { key: 'SECTIONALS', label: 'Sectionals' },
  { key: 'OTTOS', label: 'Ottos' },
]

const OBJECTS = [
  { label: 'Square', c: { kind: 'rect' as const, w: 36, d: 36 } },
  { label: 'Rectangle', c: { kind: 'rect' as const, w: 48, d: 24 } },
  { label: 'Circle', c: { kind: 'ellipse' as const, w: 36, d: 36 } },
  { label: 'Oval', c: { kind: 'ellipse' as const, w: 48, d: 30 } },
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
          {OBJECTS.map((o) => (
            <button key={o.label} className="object-btn" onClick={() => addCustom(o.c, o.label)}>
              {o.c.kind === 'ellipse' ? (
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
        <div className="palette-note">Objects are placeholders for tables, rugs, doors… label & resize them in the side panel.</div>
      </div>
    </div>
  )
}
