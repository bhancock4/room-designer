import { describe, expect, it } from 'vitest'
import { PRESETS } from './presets'
import { unitBBox } from './store'
import { components } from './connect'
import { unitSeats } from './catalog'

describe('sheet configuration presets', () => {
  it.each(PRESETS.map((p) => [p.name, p] as const))('%s reproduces its printed overall dims', (_, p) => {
    const { pieces, connections } = p.build()
    const bb = unitBBox(pieces)
    expect([bb.w, bb.h]).toEqual(p.overall)
    // every preset is one fully connected unit
    expect(components(pieces.map((x) => x.id), connections)).toHaveLength(1)
  })

  it('the as-shown config seats about 7', () => {
    const { pieces } = PRESETS[0].build()
    expect(unitSeats(pieces)).toBe(7)
  })

  it('handed presets use the reversed variants the sheet names (45L, 10R, 11R, 12R)', () => {
    const p45 = PRESETS[2].build().pieces.find((p) => p.defId === '45')!
    expect(p45.reversed).toBe(true) // 45L is the mirror of the printed 45R
    const p10r = PRESETS[2].build().pieces.find((p) => p.defId === '10')!
    expect(p10r.reversed).toBe(true) // 10R is the mirror of the printed 10L
  })
})
