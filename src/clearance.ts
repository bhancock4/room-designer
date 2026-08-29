import type { BBox, Pt } from './types'
import { pointInPoly } from './geometry'

export interface Gap {
  a: Pt
  b: Pt
  dist: number
}

const MIN_GAP = 3 // touching/snapped — not a walkway
const MIN_OVERLAP = 12 // faces must overlap this much to form a passage

/** Walkway comfort thresholds in inches. */
export const CLEAR_TIGHT = 24
export const CLEAR_OK = 36

/**
 * Find walkway gaps between unit bounding boxes and between units and walls.
 * Returns measured gaps up to maxDist so the UI can color them by comfort.
 */
export function clearanceGaps(boxes: BBox[], room: Pt[], maxDist = 48): Gap[] {
  const gaps: Gap[] = []
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const A = boxes[i]
      const B = boxes[j]
      const yo0 = Math.max(A.y, B.y)
      const yo1 = Math.min(A.y + A.h, B.y + B.h)
      if (yo1 - yo0 >= MIN_OVERLAP) {
        const [L, R] = A.x <= B.x ? [A, B] : [B, A]
        const d = R.x - (L.x + L.w)
        if (d >= MIN_GAP && d <= maxDist) {
          const y = (yo0 + yo1) / 2
          gaps.push({ a: { x: L.x + L.w, y }, b: { x: R.x, y }, dist: d })
        }
      }
      const xo0 = Math.max(A.x, B.x)
      const xo1 = Math.min(A.x + A.w, B.x + B.w)
      if (xo1 - xo0 >= MIN_OVERLAP) {
        const [T, Bo] = A.y <= B.y ? [A, B] : [B, A]
        const d = Bo.y - (T.y + T.h)
        if (d >= MIN_GAP && d <= maxDist) {
          const x = (xo0 + xo1) / 2
          gaps.push({ a: { x, y: T.y + T.h }, b: { x, y: Bo.y }, dist: d })
        }
      }
    }

  for (const box of boxes) {
    for (let i = 0; i < room.length; i++) {
      const wa = room[i]
      const wb = room[(i + 1) % room.length]
      if (wa.x === wb.x) {
        const wy0 = Math.min(wa.y, wb.y)
        const wy1 = Math.max(wa.y, wb.y)
        const yo0 = Math.max(box.y, wy0)
        const yo1 = Math.min(box.y + box.h, wy1)
        if (yo1 - yo0 < MIN_OVERLAP) continue
        const y = (yo0 + yo1) / 2
        const candidates: [number, number][] = [
          [box.x + box.w, wa.x - (box.x + box.w)], // wall to the right
          [box.x, box.x - wa.x], // wall to the left
        ]
        for (const [edge, d] of candidates) {
          if (d < MIN_GAP || d > maxDist) continue
          const sign = edge === box.x ? -1 : 1
          const mid = { x: edge + (sign * d) / 2, y }
          if (pointInPoly(mid, room)) gaps.push({ a: { x: edge, y }, b: { x: edge + sign * d, y }, dist: d })
        }
      } else if (wa.y === wb.y) {
        const wx0 = Math.min(wa.x, wb.x)
        const wx1 = Math.max(wa.x, wb.x)
        const xo0 = Math.max(box.x, wx0)
        const xo1 = Math.min(box.x + box.w, wx1)
        if (xo1 - xo0 < MIN_OVERLAP) continue
        const x = (xo0 + xo1) / 2
        const candidates: [number, number][] = [
          [box.y + box.h, wa.y - (box.y + box.h)], // wall below
          [box.y, box.y - wa.y], // wall above
        ]
        for (const [edge, d] of candidates) {
          if (d < MIN_GAP || d > maxDist) continue
          const sign = edge === box.y ? -1 : 1
          const mid = { x, y: edge + (sign * d) / 2 }
          if (pointInPoly(mid, room)) gaps.push({ a: { x, y: edge }, b: { x, y: edge + sign * d }, dist: d })
        }
      }
    }
  }
  return gaps
}

export function gapColor(d: number): string {
  return d < CLEAR_TIGHT ? '#c0392b' : d < CLEAR_OK ? '#d68910' : '#2e8b57'
}
