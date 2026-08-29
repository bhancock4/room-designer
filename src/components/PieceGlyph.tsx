import type { Shape } from '../types'
import { bboxOf } from '../geometry'

/** Mini top-down diagram of a piece in canonical orientation, spec-sheet style. */
export default function PieceGlyph({ shape, w = 74, h = 50 }: { shape: Shape; w?: number; h?: number }) {
  const bb = bboxOf(shape.pts)
  const scale = Math.min((w - 8) / bb.w, (h - 8) / bb.h)
  const ox = (w - bb.w * scale) / 2 - bb.x * scale
  const oy = (h - bb.h * scale) / 2 - bb.y * scale
  const pts = shape.pts.map((p) => ({ x: p.x * scale + ox, y: p.y * scale + oy }))
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
  return (
    <svg width={w} height={h} className="glyph">
      <path d={d} fill="#fbf8f1" stroke="#4a3f35" strokeWidth={1.2} strokeLinejoin="round" />
      {shape.decor?.map((line, i) => (
        <polyline
          key={`dec${i}`}
          points={line.map((p) => `${(p.x * scale + ox).toFixed(1)},${(p.y * scale + oy).toFixed(1)}`).join(' ')}
          fill="none"
          stroke="#6b5f52"
          strokeWidth={1}
        />
      ))}
      {shape.pts.map((p, i) => {
        const q = shape.pts[(i + 1) % shape.pts.length]
        const kind = shape.kinds[i]
        if (kind !== 'back' && kind !== 'arm' && kind !== 'open') return null
        const a = pts[i]
        const b = pts[(i + 1) % pts.length]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const len = Math.hypot(dx, dy) || 1
        const inx = (-dy / len) * 3
        const iny = (dx / len) * 3
        void p
        void q
        if (kind === 'open')
          return (
            <line
              key={i}
              x1={a.x + inx}
              y1={a.y + iny}
              x2={b.x + inx}
              y2={b.y + iny}
              stroke="#5f9c7a"
              strokeWidth={1}
              strokeDasharray="3 2"
            />
          )
        return (
          <line
            key={i}
            x1={a.x + inx * 1.2}
            y1={a.y + iny * 1.2}
            x2={b.x + inx * 1.2}
            y2={b.y + iny * 1.2}
            stroke={kind === 'back' ? 'rgba(74,63,53,0.25)' : 'rgba(74,63,53,0.5)'}
            strokeWidth={4}
          />
        )
      })}
    </svg>
  )
}
