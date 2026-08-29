import { describe, expect, it } from 'vitest'
import { clearanceGaps, gapColor } from './clearance'
import type { BBox, Pt } from './types'

const box = (x: number, y: number, w: number, h: number): BBox => ({ x, y, w, h })
const room: Pt[] = [
  { x: 0, y: 0 },
  { x: 200, y: 0 },
  { x: 200, y: 200 },
  { x: 0, y: 200 },
]

describe('clearanceGaps', () => {
  it('measures the walkway between two facing units', () => {
    const gaps = clearanceGaps([box(60, 50, 40, 40), box(130, 50, 40, 40)], room, 48)
    const between = gaps.filter((g) => g.a.x === 100 && g.b.x === 130)
    expect(between).toHaveLength(1)
    expect(between[0].dist).toBe(30)
  })

  it('ignores gaps wider than the max — plenty of room is not a warning', () => {
    const gaps = clearanceGaps([box(60, 80, 30, 30), box(150, 80, 30, 30)], room, 48)
    expect(gaps.filter((g) => g.dist === 60)).toHaveLength(0)
  })

  it('ignores snapped/touching pieces', () => {
    const gaps = clearanceGaps([box(50, 50, 40, 40), box(90, 50, 40, 40)], room, 48)
    expect(gaps.filter((g) => g.dist < 3)).toHaveLength(0)
  })

  it('measures unit-to-wall walkways, only through room interior', () => {
    const gaps = clearanceGaps([box(20, 50, 40, 40)], room, 48)
    expect(gaps).toHaveLength(1) // only the 20" gap to the left wall is within range
    expect(gaps[0].dist).toBe(20)
  })

  it('requires facing overlap — diagonal neighbors are not a walkway', () => {
    const gaps = clearanceGaps([box(60, 60, 20, 20), box(110, 110, 20, 20)], room, 48)
    expect(gaps.filter((g) => g.dist === 30)).toHaveLength(0)
  })
})

describe('gapColor', () => {
  it('red under 24, amber under 36, green at 36+', () => {
    expect(gapColor(20)).toBe('#c0392b')
    expect(gapColor(30)).toBe('#d68910')
    expect(gapColor(36)).toBe('#2e8b57')
  })
})
