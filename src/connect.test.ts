import { describe, expect, it } from 'vitest'
import { components, findSnap } from './connect'
import { shapeFor } from './catalog'
import { worldEdges, worldShape, unionBBox, bboxOf } from './geometry'
import type { Placed } from './types'

function edgesOf(p: Placed) {
  return worldEdges(p.id, worldShape(p, shapeFor(p)))
}

describe('findSnap', () => {
  it('snaps an armless sofa to the open end of a one-arm sofa', () => {
    // 11L at origin: arm left, open right edge at x=92
    const a: Placed = { id: 'a', defId: '11', x: 0, y: 0, rot: 0, reversed: false }
    // armless sofa dropped 4" away and 2" off vertically
    const b: Placed = { id: 'b', defId: '32', x: 96, y: 2, rot: 0, reversed: false }
    const snap = findSnap(edgesOf(b), edgesOf(a), 6)
    expect(snap).toBeTruthy()
    expect(snap!.connects).toBe(true)
    expect(snap!.dx).toBeCloseTo(-4)
    expect(snap!.dy).toBeCloseTo(-2) // end-alignment slide brings backs flush
  })

  it('does not snap two arms together', () => {
    // two 11L pieces, arm (left) edge of one near arm edge of a mirrored one
    const a: Placed = { id: 'a', defId: '11', x: 0, y: 0, rot: 0, reversed: false }
    const b: Placed = { id: 'b', defId: '11', x: -94, y: 0, rot: 0, reversed: true } // 11R: arm right at x=-2
    const snap = findSnap(edgesOf(b), edgesOf(a), 6)
    expect(snap).toBeNull()
  })

  it('does not snap back-to-back', () => {
    const a: Placed = { id: 'a', defId: '32', x: 0, y: 0, rot: 0, reversed: false }
    const b: Placed = { id: 'b', defId: '32', x: 0, y: -45, rot: 180, reversed: false }
    const snap = findSnap(edgesOf(b), edgesOf(a), 6)
    expect(snap).toBeNull()
  })

  it('supports the corner T-join used by the sheet configs', () => {
    // 10L rotated 270 (back on left wall), armless sofa's open left edge butts its side
    const a: Placed = { id: 'a', defId: '10', x: 0, y: 0, rot: 270, reversed: false } // bbox 43x107
    const b: Placed = { id: 'b', defId: '32', x: 47, y: 0, rot: 0, reversed: false } // 4" away from x=43
    const snap = findSnap(edgesOf(b), edgesOf(a), 6)
    expect(snap).toBeTruthy()
    expect(snap!.dx).toBeCloseTo(-4)
    expect(snap!.connects).toBe(true)
  })

  it('reconstructs the hand-marked AS-SHOWN config at exactly 168" x 107"', () => {
    const p10: Placed = { id: 'p10', defId: '10', x: 0, y: 0, rot: 270, reversed: false }
    const p32: Placed = { id: 'p32', defId: '32', x: 43, y: 0, rot: 0, reversed: false }
    const p21: Placed = { id: 'p21', defId: '21', x: 125, y: 0, rot: 0, reversed: false }
    const bb = unionBBox([p10, p32, p21].map((p) => bboxOf(worldShape(p, shapeFor(p)).pts)))
    expect(bb.w).toBe(168)
    expect(bb.h).toBe(107)
    // and the chaise open edge actually snaps to the armless sofa
    const near21: Placed = { ...p21, x: 128, y: 1 }
    const snap = findSnap(edgesOf(near21), [...edgesOf(p10), ...edgesOf(p32)], 6)
    expect(snap).toBeTruthy()
    expect(snap!.fixed.pieceId).toBe('p32')
    expect(snap!.dx).toBeCloseTo(-3)
    expect(snap!.dy).toBeCloseTo(-1)
  })

  it('requires meaningful edge contact — far-apart pieces do not snap', () => {
    const a: Placed = { id: 'a', defId: '11', x: 0, y: 0, rot: 0, reversed: false }
    const b: Placed = { id: 'b', defId: '32', x: 96, y: 40, rot: 0, reversed: false } // only 3" of potential contact
    expect(findSnap(edgesOf(b), edgesOf(a), 6)).toBeNull()
  })
})

describe('components', () => {
  it('groups connected pieces into units, leaves singletons alone', () => {
    const ids = ['a', 'b', 'c', 'd']
    const groups = components(ids, [
      { a: 'a', b: 'b' },
      { a: 'b', b: 'c' },
    ])
    const sorted = groups.map((g) => [...g].sort()).sort((x, y) => y.length - x.length)
    expect(sorted).toEqual([['a', 'b', 'c'], ['d']])
  })
})
