import { beforeEach, describe, expect, it } from 'vitest'
import { asShownConfig, pieceBBox, unitBBox, useStore } from './store'
import { displayCode } from './catalog'

beforeEach(() => {
  useStore.setState({ ...asShownConfig(), selectedId: null, solo: false, past: [], future: [] })
})

const state = () => useStore.getState()

describe('as-shown default config', () => {
  it('measures 168" x 107" as marked on the sheet', () => {
    const bb = unitBBox(state().pieces)
    expect(bb.w).toBe(168)
    expect(bb.h).toBe(107)
  })
  it('is one connected unit of three pieces', () => {
    state().select(state().pieces[0].id)
    expect(state().selectionScope()).toHaveLength(3)
  })
})

describe('reverse', () => {
  it('ignores non-reversible pieces', () => {
    const armless = state().pieces.find((p) => p.defId === '32')!
    state().select(armless.id, true)
    state().reverseSelection()
    expect(state().pieces.find((p) => p.id === armless.id)!.reversed).toBe(false)
  })
  it('flips a reversible piece and its display code', () => {
    const chaise = state().pieces.find((p) => p.defId === '21')!
    expect(displayCode(chaise)).toBe('21R')
    state().select(chaise.id, true)
    state().reverseSelection()
    const after = state().pieces.find((p) => p.id === chaise.id)!
    expect(after.reversed).toBe(true)
    expect(displayCode(after)).toBe('21L')
  })
  it('mirrors a whole unit, preserving overall dimensions', () => {
    state().select(state().pieces[0].id)
    const before = unitBBox(state().selectionScope())
    state().reverseSelection()
    const after = unitBBox(state().selectionScope())
    expect(after.w).toBe(before.w)
    expect(after.h).toBe(before.h)
    // the tux sofa was on the left; after mirroring it is on the right
    const tux = state().pieces.find((p) => p.defId === '10')!
    expect(pieceBBox(tux).x + pieceBBox(tux).w).toBeCloseTo(after.x + after.w)
  })
})

describe('rotate', () => {
  it('rotating a unit 90 degrees swaps its overall dimensions', () => {
    state().select(state().pieces[0].id)
    const before = unitBBox(state().selectionScope())
    state().rotateSelection(1)
    const after = unitBBox(state().selectionScope())
    expect(after.w).toBeCloseTo(before.h)
    expect(after.h).toBeCloseTo(before.w)
  })
  it('four rotations return every piece to its starting place', () => {
    const orig = state().pieces.map((p) => ({ ...p }))
    state().select(state().pieces[0].id)
    for (let i = 0; i < 4; i++) state().rotateSelection(1)
    for (const o of orig) {
      const p = state().pieces.find((q) => q.id === o.id)!
      expect(p.x).toBeCloseTo(o.x)
      expect(p.y).toBeCloseTo(o.y)
      expect(p.rot).toBe(o.rot)
    }
  })
})

describe('detach and delete', () => {
  it('detaching splits the unit', () => {
    const mid = state().pieces.find((p) => p.defId === '32')!
    state().select(mid.id)
    expect(state().selectionScope()).toHaveLength(3)
    state().detachSelected()
    state().select(mid.id)
    expect(state().selectionScope()).toHaveLength(1)
  })
  it('deleting a unit removes its pieces and connections', () => {
    state().select(state().pieces[0].id)
    state().deleteSelection()
    expect(state().pieces).toHaveLength(0)
    expect(state().connections).toHaveLength(0)
  })
})

describe('undo/redo', () => {
  it('round-trips a delete', () => {
    state().select(state().pieces[0].id)
    state().deleteSelection()
    expect(state().pieces).toHaveLength(0)
    state().undo()
    expect(state().pieces).toHaveLength(3)
    expect(state().connections).toHaveLength(2)
    state().redo()
    expect(state().pieces).toHaveLength(0)
  })
})

describe('room', () => {
  it('resizing scales the room polygon to the requested rectangle', () => {
    state().setRoomRect(240, 120)
    const xs = state().room.map((p) => p.x)
    const ys = state().room.map((p) => p.y)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(240)
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(120)
  })
})
