import type { Conn, Pt, WorldEdge } from './types'
import { dot, edgeDir, edgeNormal } from './geometry'

export interface SnapResult {
  dx: number
  dy: number
  moving: WorldEdge
  fixed: WorldEdge
  /** true when this pairing should create a connection on drop */
  connects: boolean
}

const PARALLEL_EPS = 0.995
const MIN_CONTACT = 20 // inches of edge contact required to consider a join

/**
 * Find the best snap translation for a set of moving edges against fixed edges.
 * Rule: at least one of the two edges must be 'open' (a connectable couch side);
 * edges must face each other (antiparallel outward normals), be nearly touching,
 * and overlap enough to be a plausible physical join. This allows both open-to-open
 * joins (armless end to armless end) and T-joins (an open end butting the side of
 * a perpendicular run — how the sheet's corner configs are built).
 */
export function findSnap(
  moving: WorldEdge[],
  fixed: WorldEdge[],
  tol = 6,
  requireConnectable = true,
): SnapResult | null {
  let best: (SnapResult & { score: number }) | null = null
  for (const eA of moving) {
    const dirA = edgeDir(eA.a, eA.b)
    const nA = edgeNormal(eA.a, eA.b)
    const lenA = Math.hypot(eA.b.x - eA.a.x, eA.b.y - eA.a.y)
    for (const eB of fixed) {
      const open = eA.kind === 'open' || eB.kind === 'open'
      if (requireConnectable && !open) continue
      const nB = edgeNormal(eB.a, eB.b)
      if (dot(nA, nB) > -PARALLEL_EPS) continue // must face each other
      const gap = dot({ x: eB.a.x - eA.a.x, y: eB.a.y - eA.a.y }, nA)
      if (gap < -2 || gap > tol) continue
      // overlap along the edge direction
      const lenB = Math.hypot(eB.b.x - eB.a.x, eB.b.y - eB.a.y)
      const t0 = dot({ x: eB.a.x - eA.a.x, y: eB.a.y - eA.a.y }, dirA)
      const t1 = dot({ x: eB.b.x - eA.a.x, y: eB.b.y - eA.a.y }, dirA)
      const bMin = Math.min(t0, t1)
      const bMax = Math.max(t0, t1)
      const needed = Math.min(MIN_CONTACT, 0.9 * Math.min(lenA, lenB))
      // end-alignment slide: prefer flush ends when close
      let slide = 0
      const alignStart = bMin // move A by this along dirA to align starts
      const alignEnd = bMax - lenA
      for (const cand of [alignStart, alignEnd]) {
        if (Math.abs(cand) < 4 && (slide === 0 || Math.abs(cand) < Math.abs(slide))) slide = cand
      }
      const overlapAfter = Math.min(lenA + slide, bMax) - Math.max(slide, bMin) // contact once slid
      if (overlapAfter < needed) continue
      const dx = nA.x * gap + dirA.x * slide
      const dy = nA.y * gap + dirA.y * slide
      const score = Math.abs(gap) + Math.abs(slide) * 0.5 + (open ? 0 : 4) + (eA.kind === 'open' && eB.kind === 'open' ? -0.5 : 0)
      if (!best || score < best.score) {
        best = { dx, dy, moving: eA, fixed: eB, connects: open, score }
      }
    }
  }
  return best
}

/** Snap any piece edge to room walls (no connection made). */
export function findWallSnap(moving: WorldEdge[], walls: [Pt, Pt][], tol = 5): { dx: number; dy: number } | null {
  let bestX: number | null = null
  let bestY: number | null = null
  for (const e of moving) {
    const dir = edgeDir(e.a, e.b)
    for (const [wa, wb] of walls) {
      const wdir = edgeDir(wa, wb)
      if (Math.abs(dot(dir, wdir)) < PARALLEL_EPS) continue
      const n = edgeNormal(wa, wb)
      const gap = dot({ x: wa.x - e.a.x, y: wa.y - e.a.y }, n)
      if (Math.abs(gap) > tol || Math.abs(gap) < 0.01) continue
      // overlap check along wall
      const t0 = dot({ x: e.a.x - wa.x, y: e.a.y - wa.y }, wdir)
      const t1 = dot({ x: e.b.x - wa.x, y: e.b.y - wa.y }, wdir)
      const wlen = Math.hypot(wb.x - wa.x, wb.y - wa.y)
      if (Math.max(t0, t1) < 0 || Math.min(t0, t1) > wlen) continue
      const dx = n.x * gap
      const dy = n.y * gap
      if (Math.abs(dx) > 0.01 && (bestX === null || Math.abs(dx) < Math.abs(bestX))) bestX = dx
      if (Math.abs(dy) > 0.01 && (bestY === null || Math.abs(dy) < Math.abs(bestY))) bestY = dy
    }
  }
  if (bestX === null && bestY === null) return null
  return { dx: bestX ?? 0, dy: bestY ?? 0 }
}

/** Connected components over pieces given connections; singletons included. */
export function components(pieceIds: string[], connections: Conn[]): string[][] {
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    let r = x
    while (parent.get(r) !== r) r = parent.get(r)!
    parent.set(x, r)
    return r
  }
  for (const id of pieceIds) parent.set(id, id)
  for (const c of connections) {
    if (!parent.has(c.a) || !parent.has(c.b)) continue
    const ra = find(c.a)
    const rb = find(c.b)
    if (ra !== rb) parent.set(ra, rb)
  }
  const groups = new Map<string, string[]>()
  for (const id of pieceIds) {
    const r = find(id)
    if (!groups.has(r)) groups.set(r, [])
    groups.get(r)!.push(id)
  }
  return [...groups.values()]
}

export function unitOf(pieceId: string, pieceIds: string[], connections: Conn[]): string[] {
  return components(pieceIds, connections).find((g) => g.includes(pieceId)) ?? [pieceId]
}
