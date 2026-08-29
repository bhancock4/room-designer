import type { Pt, Shape, EdgeKind, BBox, Placed, WorldEdge } from './types'

export function bboxOf(pts: Pt[]): BBox {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

/** Mirror across the vertical axis of the shape's bbox; winding restored to clockwise. */
export function mirrorShape(s: Shape): Shape {
  const { x, w } = bboxOf(s.pts)
  const axis = 2 * x + w
  const n = s.pts.length
  const mirrored = s.pts.map((p) => ({ x: axis - p.x, y: p.y }))
  const pts = [...mirrored].reverse()
  const kinds: EdgeKind[] = []
  for (let j = 0; j < n; j++) kinds.push(s.kinds[(2 * n - 2 - j) % n])
  const decor = s.decor?.map((line) => line.map((p) => ({ x: axis - p.x, y: p.y })))
  return { pts, kinds, decor }
}

/** Rotate clockwise by rot (multiple of 90), then normalize so bbox min corner is (0,0). */
export function rotateShape(s: Shape, rot: number): Shape {
  const steps = ((rot % 360) + 360) / 90 % 4
  const r90 = (p: Pt): Pt => ({ x: -p.y, y: p.x })
  let pts = s.pts
  let decor = s.decor
  for (let i = 0; i < steps; i++) {
    pts = pts.map(r90)
    decor = decor?.map((line) => line.map(r90))
  }
  const bb = bboxOf(pts)
  const shift = (p: Pt): Pt => ({ x: p.x - bb.x, y: p.y - bb.y })
  return { pts: pts.map(shift), kinds: s.kinds, decor: decor?.map((line) => line.map(shift)) }
}

/** Shape transformed by a piece's reversed/rot, normalized to (0,0), then translated to (x, y). */
export function worldShape(p: Placed, base: Shape): Shape {
  let s = base
  if (p.reversed) s = mirrorShape(s)
  s = rotateShape(s, p.rot)
  const move = (q: Pt): Pt => ({ x: q.x + p.x, y: q.y + p.y })
  return { pts: s.pts.map(move), kinds: s.kinds, decor: s.decor?.map((line) => line.map(move)) }
}

/** Transform auxiliary points (e.g. a door's keep-clear zone) with a piece's full transform. */
export function worldAux(p: Placed, base: Shape, aux: Pt[]): Pt[] {
  const carrier: Shape = { pts: base.pts, kinds: base.kinds, decor: [aux] }
  return worldShape(p, carrier).decor![0]
}

/** True when two axis-aligned boxes overlap by more than eps. */
export function rectsIntersect(a: BBox, b: BBox, eps = 0.5): boolean {
  return a.x + a.w > b.x + eps && b.x + b.w > a.x + eps && a.y + a.h > b.y + eps && b.y + b.h > a.y + eps
}

export function worldEdges(pieceId: string, s: Shape): WorldEdge[] {
  const n = s.pts.length
  const edges: WorldEdge[] = []
  for (let i = 0; i < n; i++) {
    edges.push({ pieceId, index: i, a: s.pts[i], b: s.pts[(i + 1) % n], kind: s.kinds[i] })
  }
  return edges
}

/** Outward normal for a clockwise polygon in y-down coordinates. */
export function edgeNormal(a: Pt, b: Pt): Pt {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { x: dy / len, y: -dx / len }
}

export function edgeDir(a: Pt, b: Pt): Pt {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { x: dx / len, y: dy / len }
}

export function dot(a: Pt, b: Pt): number {
  return a.x * b.x + a.y * b.y
}

function segsIntersect(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const d = (a: Pt, b: Pt, c: Pt) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  const d1 = d(p3, p4, p1)
  const d2 = d(p3, p4, p2)
  const d3 = d(p1, p2, p3)
  const d4 = d(p1, p2, p4)
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

export function pointInPoly(pt: Pt, poly: Pt[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i]
    const pj = poly[j]
    if (pi.y > pt.y !== pj.y > pt.y && pt.x < ((pj.x - pi.x) * (pt.y - pi.y)) / (pj.y - pi.y) + pi.x)
      inside = true
  }
  return inside
}

/** True if two simple polygons overlap with positive area (shared edges don't count). */
export function polysOverlap(a: Pt[], b: Pt[]): boolean {
  const ba = bboxOf(a)
  const bb = bboxOf(b)
  const eps = 0.5 // half-inch tolerance so flush snapped edges don't read as overlap
  if (ba.x + ba.w <= bb.x + eps || bb.x + bb.w <= ba.x + eps) return false
  if (ba.y + ba.h <= bb.y + eps || bb.y + bb.h <= ba.y + eps) return false
  // shrink both slightly toward centroid to ignore edge-touching
  const shrink = (poly: Pt[]): Pt[] => {
    const c = centroid(poly)
    return poly.map((p) => ({ x: p.x + (c.x - p.x) * 0.02, y: p.y + (c.y - p.y) * 0.02 }))
  }
  const sa = shrink(a)
  const sb = shrink(b)
  for (let i = 0; i < sa.length; i++)
    for (let j = 0; j < sb.length; j++)
      if (segsIntersect(sa[i], sa[(i + 1) % sa.length], sb[j], sb[(j + 1) % sb.length])) return true
  if (pointInPoly(sa[0], sb)) return true
  if (pointInPoly(sb[0], sa)) return true
  return false
}

export function centroid(poly: Pt[]): Pt {
  let x = 0,
    y = 0
  for (const p of poly) {
    x += p.x
    y += p.y
  }
  return { x: x / poly.length, y: y / poly.length }
}

export function unionBBox(boxes: BBox[]): BBox {
  const pts: Pt[] = []
  for (const b of boxes) {
    pts.push({ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y + b.h })
  }
  return bboxOf(pts)
}

/** Format inches as e.g. `168"` (whole) or `43.5"`. */
export function fmtIn(v: number): string {
  const r = Math.round(v * 2) / 2
  return `${r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)}″`
}

export type UnitMode = 'in' | 'ftin'

/** Format inches per display mode: 107 -> `107″` or `8′11″`. */
export function fmtLen(v: number, mode: UnitMode): string {
  if (mode === 'in') return fmtIn(v)
  const r = Math.round(v * 2) / 2
  const ft = Math.floor(r / 12)
  const rem = Math.round((r - ft * 12) * 2) / 2
  if (ft === 0) return fmtIn(v)
  const inStr = rem % 1 === 0 ? rem.toFixed(0) : rem.toFixed(1)
  return `${ft}′${inStr}″`
}
