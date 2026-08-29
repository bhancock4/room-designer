import { describe, expect, it } from 'vitest'
import { catalogById, customShape, doorZonePts, isReversible, DOOR_CLEARANCE } from './catalog'
import { bboxOf, mirrorShape, rectsIntersect, worldAux } from './geometry'
import type { CustomSpec, Placed } from './types'

const door: CustomSpec = { kind: 'door', w: 32, d: 5 }
const placedDoor = (x: number, y: number, rot: 0 | 90 | 180 | 270, reversed = false): Placed => ({
  id: 'door1',
  custom: door,
  x,
  y,
  rot,
  reversed,
})

describe('door object', () => {
  it('does not snap-connect to couches (no open edges)', () => {
    expect(customShape(door).kinds.every((k) => k !== 'open')).toBe(true)
  })

  it('keeps at least a 32" deep zone in front of the opening', () => {
    const zone = bboxOf(doorZonePts(door))
    expect(zone).toEqual({ x: 0, y: 5, w: 32, h: DOOR_CLEARANCE })
    // wider doors sweep a deeper zone
    const wide = bboxOf(doorZonePts({ kind: 'door', w: 40, d: 5 }))
    expect(wide.h).toBe(40)
  })

  it('zone transforms with the door: rot 0 projects into the room below', () => {
    const p = placedDoor(10, 20, 0)
    const zbb = bboxOf(worldAux(p, customShape(door), doorZonePts(door)))
    expect(zbb).toEqual({ x: 10, y: 25, w: 32, h: 32 })
  })

  it('zone transforms with the door: rot 90 projects to the left of the jamb', () => {
    const p = placedDoor(10, 20, 90)
    const zbb = bboxOf(worldAux(p, customShape(door), doorZonePts(door)))
    expect(zbb).toEqual({ x: -22, y: 20, w: 32, h: 32 })
  })

  it('reversing flips the hinge side', () => {
    expect(isReversible(placedDoor(0, 0, 0))).toBe(true)
    const leaf = customShape(door).decor![1]
    expect(leaf[0].x).toBe(0) // hinge on the left
    const mirroredLeaf = mirrorShape(customShape(door)).decor![1]
    expect(mirroredLeaf[0].x).toBe(32) // hinge on the right after F
  })

  it('blocked detection: sofa in the swing zone intersects, sofa beside it does not', () => {
    const zone = { x: 10, y: 25, w: 32, h: 32 }
    expect(rectsIntersect({ x: 20, y: 40, w: 82, h: 43 }, zone)).toBe(true)
    expect(rectsIntersect({ x: 50, y: 25, w: 82, h: 43 }, zone)).toBe(false)
  })
})

describe('angled seat decor', () => {
  it('wedge and cuddler carry seat-front lines so the angle reads at a glance', () => {
    expect(catalogById.get('41')!.shape.decor?.length).toBeGreaterThan(0)
    expect(catalogById.get('75')!.shape.decor?.length).toBeGreaterThan(0)
  })
})
