import { describe, expect, it } from 'vitest'
import { bboxOf, fmtLen, mirrorShape, polysOverlap, rotateShape, worldShape } from './geometry'
import type { Placed, Shape } from './types'

const oneArmLeft: Shape = {
  pts: [
    { x: 0, y: 0 },
    { x: 92, y: 0 },
    { x: 92, y: 43 },
    { x: 0, y: 43 },
  ],
  kinds: ['back', 'open', 'front', 'arm'], // top, right, bottom, left
}

function kindOfEdgeAt(s: Shape, predicate: (a: { x: number; y: number }, b: { x: number; y: number }) => boolean) {
  for (let i = 0; i < s.pts.length; i++) {
    const a = s.pts[i]
    const b = s.pts[(i + 1) % s.pts.length]
    if (predicate(a, b)) return s.kinds[i]
  }
  return undefined
}

describe('mirrorShape', () => {
  it('swaps arm and open sides, keeps back on top', () => {
    const m = mirrorShape(oneArmLeft)
    expect(kindOfEdgeAt(m, (a, b) => a.y === 0 && b.y === 0)).toBe('back')
    expect(kindOfEdgeAt(m, (a, b) => a.x === 0 && b.x === 0)).toBe('open') // left is now open
    expect(kindOfEdgeAt(m, (a, b) => a.x === 92 && b.x === 92)).toBe('arm') // right is now the arm
  })

  it('is an involution', () => {
    const twice = mirrorShape(mirrorShape(oneArmLeft))
    expect(bboxOf(twice.pts)).toEqual(bboxOf(oneArmLeft.pts))
    expect(kindOfEdgeAt(twice, (a, b) => a.x === 0 && b.x === 0)).toBe('arm')
  })
})

describe('rotateShape', () => {
  it('90 CW moves the back to the right side and swaps bbox dims', () => {
    const r = rotateShape(oneArmLeft, 90)
    const bb = bboxOf(r.pts)
    expect(bb.w).toBe(43)
    expect(bb.h).toBe(92)
    expect(bb.x).toBe(0)
    expect(bb.y).toBe(0)
    expect(kindOfEdgeAt(r, (a, b) => a.x === 43 && b.x === 43)).toBe('back')
  })

  it('270 CW moves the back to the left side', () => {
    const r = rotateShape(oneArmLeft, 270)
    expect(kindOfEdgeAt(r, (a, b) => a.x === 0 && b.x === 0)).toBe('back')
  })
})

describe('worldShape', () => {
  it('places the transformed bbox at the piece position', () => {
    const p: Placed = { id: 'a', x: 24, y: 18, rot: 270, reversed: false }
    const w = worldShape(p, oneArmLeft)
    const bb = bboxOf(w.pts)
    expect(bb).toEqual({ x: 24, y: 18, w: 43, h: 92 })
  })
})

describe('fmtLen', () => {
  it('formats inches and feet+inches', () => {
    expect(fmtLen(168, 'in')).toBe('168″')
    expect(fmtLen(168, 'ftin')).toBe('14′0″')
    expect(fmtLen(107, 'ftin')).toBe('8′11″')
    expect(fmtLen(43.5, 'ftin')).toBe('3′7.5″')
    expect(fmtLen(11, 'ftin')).toBe('11″')
  })
})

describe('polysOverlap', () => {
  const sq = (x: number, y: number, w: number, h: number) => [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ]
  it('flush edge-to-edge placement is not overlap', () => {
    expect(polysOverlap(sq(0, 0, 40, 40), sq(40, 0, 40, 40))).toBe(false)
  })
  it('real intersection is overlap', () => {
    expect(polysOverlap(sq(0, 0, 40, 40), sq(20, 20, 40, 40))).toBe(true)
  })
  it('containment is overlap', () => {
    expect(polysOverlap(sq(0, 0, 100, 100), sq(30, 30, 10, 10))).toBe(true)
  })
})
