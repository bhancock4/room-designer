import { describe, expect, it } from 'vitest'
import { CATALOG, catalogById, displayCode, shapeFor } from './catalog'
import { bboxOf } from './geometry'
import type { Placed } from './types'

const place = (defId: string, reversed = false): Placed => ({
  id: 'x',
  defId,
  x: 0,
  y: 0,
  rot: 0,
  reversed,
})

describe('catalog matches the Cascade spec sheet', () => {
  it.each([
    ['01', 99, 43],
    ['02', 73, 43],
    ['44', 65, 43],
    ['81', 102, 43],
    ['33', 102, 69],
    ['10', 107, 43],
    ['11', 92, 43],
    ['32', 82, 43],
    ['45', 92, 69],
    ['95', 80, 43],
    ['12', 65, 43],
    ['31', 55, 43],
    ['17', 43, 43],
    ['24', 38, 43],
    ['18', 28, 43],
    ['41', 54, 54],
    ['21', 43, 69],
    ['75', 70, 74],
    ['67', 50, 50],
    ['29', 39, 39],
    ['35', 38, 38],
    ['43', 49, 27],
    ['47', 49, 27],
  ])('%s is %d x %d inches', (id, w, d) => {
    const def = catalogById.get(id)!
    expect(def.w).toBe(w)
    expect(def.d).toBe(d)
    const bb = bboxOf(def.shape.pts)
    expect(bb.w).toBeCloseTo(w)
    expect(bb.h).toBeCloseTo(d)
  })

  it('starred pieces are reversible, others are not', () => {
    const reversible = CATALOG.filter((d) => d.reversible).map((d) => d.id).sort()
    expect(reversible).toEqual(['10', '11', '12', '21', '24', '33', '45', '50', '75', '95', '97'].sort())
  })

  it('reversing flips the printed handedness in the display code', () => {
    expect(displayCode(place('11'))).toBe('11L')
    expect(displayCode(place('11', true))).toBe('11R')
    expect(displayCode(place('45'))).toBe('45R')
    expect(displayCode(place('45', true))).toBe('45L')
    expect(displayCode(place('32', true))).toBe('32') // no hand, no change
  })

  it('one-arm pieces have exactly one open side; armless have two', () => {
    const openCount = (id: string) => shapeFor(place(id)).kinds.filter((k) => k === 'open').length
    expect(openCount('11')).toBe(1)
    expect(openCount('10')).toBe(1)
    expect(openCount('21')).toBe(1)
    expect(openCount('32')).toBe(2)
    expect(openCount('31')).toBe(2)
    expect(openCount('18')).toBe(2)
    expect(openCount('01')).toBe(0) // two-arm sofa: standalone
    expect(openCount('29')).toBe(4) // ottomans connect on all sides
  })
})
