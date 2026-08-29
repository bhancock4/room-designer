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

describe('nudge with snap', () => {
  it('an arrow move toward a nearby open edge snaps flush and connects', () => {
    const p11 = { id: 'n1', defId: '11', x: 24, y: 20, rot: 0 as const, reversed: false }
    const p32 = { id: 'n2', defId: '32', x: 24 + 92 + 3, y: 22, rot: 0 as const, reversed: false }
    useStore.setState({ pieces: [p11, p32], connections: [], selectedId: 'n2', solo: false })
    useStore.getState().nudge(-1, 0)
    const moved = useStore.getState().pieces.find((p) => p.id === 'n2')!
    expect(moved.x).toBe(24 + 92) // flush against the 11L's open end
    expect(moved.y).toBe(20) // ends aligned by the snap
    expect(useStore.getState().connections).toEqual([{ a: 'n2', b: 'n1' }])
  })

  it('a nudge away from a flush edge does not stick', () => {
    const p11 = { id: 'n1', defId: '11', x: 24, y: 20, rot: 0 as const, reversed: false }
    const p31 = { id: 'n2', defId: '31', x: 24 + 92, y: 20, rot: 0 as const, reversed: false }
    useStore.setState({ pieces: [p11, p31], connections: [], selectedId: 'n2', solo: false })
    useStore.getState().nudge(1, 0)
    expect(useStore.getState().pieces.find((p) => p.id === 'n2')!.x).toBe(24 + 93)
  })

  it('snaps to a wall when nudging toward it', () => {
    const p32 = { id: 'n1', defId: '32', x: 30, y: 3, rot: 0 as const, reversed: false }
    useStore.setState({ pieces: [p32], connections: [], selectedId: 'n1', solo: false })
    useStore.getState().nudge(0, -1) // toward the y=0 wall, 2" gap
    expect(useStore.getState().pieces[0].y).toBe(0)
  })
})

describe('rotation steps and polygons', () => {
  it('couch pieces rotate 90 by default, shapes 22.5, and per-piece override wins', () => {
    useStore.setState({ rotStepPieces: 90, rotStepShapes: 22.5 })
    const couch = state().pieces[1] // armless 32, rot 0
    state().select(couch.id, true)
    state().rotateSelection(1)
    expect(state().pieces.find((p) => p.id === couch.id)!.rot).toBe(90)

    state().addCustom({ kind: 'poly', w: 36, d: 36, sides: 4 })
    const poly = state().pieces[state().pieces.length - 1]
    state().rotateSelection(1)
    expect(state().pieces.find((p) => p.id === poly.id)!.rot).toBe(22.5)

    state().setPieceRotStep(poly.id, 45)
    state().rotateSelection(1)
    expect(state().pieces.find((p) => p.id === poly.id)!.rot).toBe(67.5)
  })

  it('reset returns a rotated piece to 0 degrees, keeping its center in place', () => {
    state().addCustom({ kind: 'poly', w: 48, d: 30, sides: 4 })
    const poly = state().pieces[state().pieces.length - 1]
    const before = pieceBBox(state().pieces.find((p) => p.id === poly.id)!)
    state().setPieceRotStep(poly.id, 22.5)
    state().rotateSelection(1)
    state().rotateSelection(1)
    expect(state().pieces.find((p) => p.id === poly.id)!.rot).toBe(45)
    state().resetRotation()
    const after = state().pieces.find((p) => p.id === poly.id)!
    expect(after.rot).toBe(0)
    const bbAfter = pieceBBox(after)
    expect(bbAfter.x + bbAfter.w / 2).toBeCloseTo(before.x + before.w / 2, 0)
    expect(bbAfter.y + bbAfter.h / 2).toBeCloseTo(before.y + before.h / 2, 0)
    expect([bbAfter.w, bbAfter.h]).toEqual([48, 30])
  })

  it('polygon shape: 4 sides is an exact rectangle, sides are editable, resize clamps', () => {
    state().addCustom({ kind: 'poly', w: 48, d: 30, sides: 4 })
    const poly = state().pieces[state().pieces.length - 1]
    const bb = pieceBBox(poly)
    expect([bb.w, bb.h]).toEqual([48, 30])
    state().setCustomSides(poly.id, 6)
    expect(state().pieces.find((p) => p.id === poly.id)!.custom!.sides).toBe(6)
    state().resizeCustom(poly.id, 2, 60)
    const after = state().pieces.find((p) => p.id === poly.id)!.custom!
    expect(after.w).toBe(4) // clamped to minimum
    expect(after.d).toBe(60)
  })
})

describe('room templates', () => {
  it('applying a template swaps room and objects but keeps couch pieces', () => {
    state().addCustom({ kind: 'door', w: 32, d: 5 })
    const couchCount = state().pieces.filter((p) => !p.custom).length
    const template = {
      room: [
        { x: 0, y: 0 },
        { x: 300, y: 0 },
        { x: 300, y: 200 },
        { x: 0, y: 200 },
      ],
      objects: [
        { id: 'tpl1', custom: { kind: 'ellipse' as const, w: 40, d: 40 }, label: 'rug', x: 10, y: 10, rot: 0, reversed: false },
      ],
    }
    state().applyRoomTemplate(template.room, template.objects)
    expect(state().pieces.filter((p) => !p.custom)).toHaveLength(couchCount)
    const objects = state().pieces.filter((p) => p.custom)
    expect(objects).toHaveLength(1)
    expect(objects[0].label).toBe('rug')
    expect(objects[0].id).not.toBe('tpl1') // fresh ids so templates can be applied repeatedly
    expect(Math.max(...state().room.map((p) => p.x))).toBe(300)
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
