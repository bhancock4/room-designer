import { create } from 'zustand'
import type { Conn, CustomSpec, Placed, Pt, Rot, BBox } from './types'
import { bboxOf, unionBBox, worldEdges, worldShape } from './geometry'
import { components, findSnap, findWallSnap, unitOf } from './connect'
import { shapeFor, isReversible } from './catalog'

export interface Snapshot {
  room: Pt[]
  pieces: Placed[]
  connections: Conn[]
}

let idCounter = 1
export function newId(): string {
  return `p${Date.now().toString(36)}${(idCounter++).toString(36)}`
}

function loadNum(key: string, dflt: number): number {
  try {
    const v = Number(localStorage.getItem(key))
    return v > 0 ? v : dflt
  } catch {
    return dflt
  }
}

function clampStep(v: number, dflt: number): number {
  return v > 0 && v <= 180 ? v : dflt
}

/** Rotation step for a piece: its own override, else the shape/couch default. */
export function effectiveRotStep(p: Placed, s: { rotStepPieces: number; rotStepShapes: number }): number {
  return p.rotStep ?? (p.custom ? s.rotStepShapes : s.rotStepPieces)
}

export function defaultRoom(w = 300, h = 300): Pt[] {
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ]
}

/** The hand-marked "AS SHOWN" config from the sheet: 10L + 32 + 21R, 168" x 107". */
export function asShownConfig(): Snapshot {
  const p10: Placed = { id: newId(), defId: '10', x: 24, y: 18, rot: 270, reversed: false }
  const p32: Placed = { id: newId(), defId: '32', x: 24 + 43, y: 18, rot: 0, reversed: false }
  const p21: Placed = { id: newId(), defId: '21', x: 24 + 43 + 82, y: 18, rot: 0, reversed: false }
  return {
    room: defaultRoom(),
    pieces: [p10, p32, p21],
    connections: [
      { a: p10.id, b: p32.id },
      { a: p32.id, b: p21.id },
    ],
  }
}

export function pieceBBox(p: Placed): BBox {
  return bboxOf(worldShape(p, shapeFor(p)).pts)
}

export function unitBBox(pieces: Placed[]): BBox {
  return unionBBox(pieces.map(pieceBBox))
}

export type UnitMode = 'in' | 'ftin'

function initialUnits(): UnitMode {
  try {
    return localStorage.getItem('couch-planner:v1:units') === 'ftin' ? 'ftin' : 'in'
  } catch {
    return 'in'
  }
}

interface AppState extends Snapshot {
  selectedId: string | null
  solo: boolean
  editRoom: boolean
  units: UnitMode
  toggleUnits(): void
  showClearance: boolean
  toggleClearance(): void
  setLayout(pieces: Placed[], connections: Conn[]): void
  rotStepPieces: number
  rotStepShapes: number
  setRotSteps(pieces: number, shapes: number): void
  setPieceRotStep(id: string, step: number | undefined): void
  resizeCustom(id: string, w: number, d: number): void
  setCustomSides(id: string, sides: number): void
  applyRoomTemplate(room: Pt[], objects: Placed[]): void
  past: Snapshot[]
  future: Snapshot[]

  snapshot(): Snapshot
  push(): void
  undo(): void
  redo(): void
  loadSnapshot(s: Snapshot): void

  select(id: string | null, solo?: boolean): void
  tabSelect(dir: 1 | -1): void
  selectionScope(): Placed[]

  addPiece(defId: string): void
  addCustom(c: CustomSpec, label?: string): void
  duplicateSelection(): void
  deleteSelection(): void
  setLabel(id: string, label: string): void
  setCustomDims(id: string, w: number, d: number): void

  moveScope(ids: string[], dx: number, dy: number): void
  setPositions(entries: { id: string; x: number; y: number }[]): void
  nudge(dx: number, dy: number): void
  rotateSelection(dir: 1 | -1): void
  rotateScopeBy(theta: number): void
  resetRotation(): void
  reverseSelection(): void
  detachSelected(): void
  detachPiece(id: string): void
  connect(a: string, b: string): void

  setEditRoom(on: boolean): void
  setRoom(pts: Pt[]): void
  setRoomRect(w: number, h: number): void
}

export const useStore = create<AppState>((set, get) => ({
  ...asShownConfig(),
  selectedId: null,
  solo: false,
  editRoom: false,
  units: initialUnits(),
  toggleUnits() {
    const next: UnitMode = get().units === 'in' ? 'ftin' : 'in'
    try {
      localStorage.setItem('couch-planner:v1:units', next)
    } catch {
      /* ignore */
    }
    set({ units: next })
  },
  showClearance: (() => {
    try {
      return localStorage.getItem('couch-planner:v1:clearance') !== 'off'
    } catch {
      return true
    }
  })(),
  toggleClearance() {
    const next = !get().showClearance
    try {
      localStorage.setItem('couch-planner:v1:clearance', next ? 'on' : 'off')
    } catch {
      /* ignore */
    }
    set({ showClearance: next })
  },
  setLayout(pieces, connections) {
    get().push()
    set({ pieces, connections, selectedId: null, solo: false })
  },
  rotStepPieces: loadNum('couch-planner:v1:rotPieces', 90),
  rotStepShapes: loadNum('couch-planner:v1:rotShapes', 22.5),
  setRotSteps(pieces, shapes) {
    const rp = clampStep(pieces, 90)
    const rs = clampStep(shapes, 22.5)
    try {
      localStorage.setItem('couch-planner:v1:rotPieces', String(rp))
      localStorage.setItem('couch-planner:v1:rotShapes', String(rs))
    } catch {
      /* ignore */
    }
    set({ rotStepPieces: rp, rotStepShapes: rs })
  },
  setPieceRotStep(id, step) {
    set((s) => ({
      pieces: s.pieces.map((p) =>
        p.id === id ? { ...p, rotStep: step === undefined ? undefined : clampStep(step, 90) } : p,
      ),
    }))
  },
  resizeCustom(id, w, d) {
    set((s) => ({
      pieces: s.pieces.map((p) =>
        p.id === id && p.custom ? { ...p, custom: { ...p.custom, w: Math.max(4, w), d: Math.max(4, d) } } : p,
      ),
    }))
  },
  setCustomSides(id, sides) {
    get().push()
    set((s) => ({
      pieces: s.pieces.map((p) =>
        p.id === id && p.custom?.kind === 'poly'
          ? { ...p, custom: { ...p.custom, sides: Math.min(24, Math.max(3, Math.round(sides) || 4)) } }
          : p,
      ),
    }))
  },
  applyRoomTemplate(room, objects) {
    get().push()
    const idMap = new Map(objects.map((o) => [o.id, newId()]))
    const fresh = objects.map((o) => ({ ...structuredClone(o), id: idMap.get(o.id)! }))
    set((s) => {
      const couches = s.pieces.filter((p) => !p.custom)
      const keep = new Set(couches.map((p) => p.id))
      return {
        room: structuredClone(room),
        pieces: [...couches, ...fresh],
        connections: s.connections.filter((c) => keep.has(c.a) && keep.has(c.b)),
        selectedId: null,
        solo: false,
      }
    })
  },
  past: [],
  future: [],

  snapshot() {
    const { room, pieces, connections } = get()
    return structuredClone({ room, pieces, connections })
  },
  push() {
    set((s) => ({ past: [...s.past.slice(-49), get().snapshot()], future: [] }))
  },
  undo() {
    const { past } = get()
    if (!past.length) return
    const prev = past[past.length - 1]
    set((s) => ({
      ...prev,
      past: s.past.slice(0, -1),
      future: [get().snapshot(), ...s.future].slice(0, 50),
      selectedId: prev.pieces.some((p) => p.id === s.selectedId) ? s.selectedId : null,
    }))
  },
  redo() {
    const { future } = get()
    if (!future.length) return
    const next = future[0]
    set((s) => ({
      ...next,
      future: s.future.slice(1),
      past: [...s.past, get().snapshot()],
      selectedId: next.pieces.some((p) => p.id === s.selectedId) ? s.selectedId : null,
    }))
  },
  loadSnapshot(snap) {
    get().push()
    set({ ...structuredClone(snap), selectedId: null, solo: false })
  },

  select(id, solo = false) {
    set({ selectedId: id, solo })
  },
  tabSelect(dir) {
    const { pieces, connections, selectedId } = get()
    if (!pieces.length) return
    const units = components(
      pieces.map((p) => p.id),
      connections,
    )
    units.sort((a, b) => pieces.findIndex((p) => p.id === a[0]) - pieces.findIndex((p) => p.id === b[0]))
    const cur = selectedId ? units.findIndex((u) => u.includes(selectedId)) : -1
    const next = units[(cur + dir + units.length) % units.length]
    set({ selectedId: next[0], solo: false })
  },
  selectionScope() {
    const { pieces, connections, selectedId, solo } = get()
    if (!selectedId) return []
    const sel = pieces.find((p) => p.id === selectedId)
    if (!sel) return []
    if (solo) return [sel]
    const unit = unitOf(selectedId, pieces.map((p) => p.id), connections)
    return pieces.filter((p) => unit.includes(p.id))
  },

  addPiece(defId) {
    get().push()
    const { room, pieces } = get()
    const rb = bboxOf(room)
    const p: Placed = { id: newId(), defId, x: 0, y: 0, rot: 0, reversed: false }
    const bb = pieceBBox(p)
    const n = pieces.length
    p.x = Math.round(rb.x + rb.w / 2 - bb.w / 2 + ((n * 7) % 42) - 21)
    p.y = Math.round(rb.y + rb.h / 2 - bb.h / 2 + ((n * 11) % 42) - 21)
    set((s) => ({ pieces: [...s.pieces, p], selectedId: p.id, solo: false }))
  },
  addCustom(c, label) {
    get().push()
    const { room, pieces } = get()
    const rb = bboxOf(room)
    const n = pieces.length
    const p: Placed = {
      id: newId(),
      custom: c,
      label,
      x: Math.round(rb.x + rb.w / 2 - c.w / 2 + ((n * 7) % 42) - 21),
      y: Math.round(rb.y + rb.h / 2 - c.d / 2 + ((n * 11) % 42) - 21),
      rot: 0,
      reversed: false,
    }
    set((s) => ({ pieces: [...s.pieces, p], selectedId: p.id, solo: false }))
  },
  duplicateSelection() {
    const scope = get().selectionScope()
    if (!scope.length) return
    get().push()
    const idMap = new Map(scope.map((p) => [p.id, newId()]))
    const copies = scope.map((p) => ({ ...structuredClone(p), id: idMap.get(p.id)!, x: p.x + 12, y: p.y + 12 }))
    const newConns = get()
      .connections.filter((c) => idMap.has(c.a) && idMap.has(c.b))
      .map((c) => ({ a: idMap.get(c.a)!, b: idMap.get(c.b)! }))
    set((s) => ({
      pieces: [...s.pieces, ...copies],
      connections: [...s.connections, ...newConns],
      selectedId: copies[0].id,
    }))
  },
  deleteSelection() {
    const scope = get().selectionScope()
    if (!scope.length) return
    get().push()
    const ids = new Set(scope.map((p) => p.id))
    set((s) => ({
      pieces: s.pieces.filter((p) => !ids.has(p.id)),
      connections: s.connections.filter((c) => !ids.has(c.a) && !ids.has(c.b)),
      selectedId: null,
    }))
  },
  setLabel(id, label) {
    set((s) => ({ pieces: s.pieces.map((p) => (p.id === id ? { ...p, label } : p)) }))
  },
  setCustomDims(id, w, d) {
    get().push()
    set((s) => ({
      pieces: s.pieces.map((p) =>
        p.id === id && p.custom ? { ...p, custom: { ...p.custom, w: Math.max(1, w), d: Math.max(1, d) } } : p,
      ),
    }))
  },

  moveScope(ids, dx, dy) {
    const idSet = new Set(ids)
    set((s) => ({
      pieces: s.pieces.map((p) => (idSet.has(p.id) ? { ...p, x: p.x + dx, y: p.y + dy } : p)),
    }))
  },
  setPositions(entries) {
    const map = new Map(entries.map((e) => [e.id, e]))
    set((s) => ({
      pieces: s.pieces.map((p) => {
        const e = map.get(p.id)
        return e ? { ...p, x: e.x, y: e.y } : p
      }),
    }))
  },
  nudge(dx, dy) {
    const scope = get().selectionScope()
    if (!scope.length) return
    get().push()
    // same snapping as dragging, but only when moving TOWARD the snap target
    // (dot > 0) so a nudge away from a flush edge doesn't stick
    const idSet = new Set(scope.map((p) => p.id))
    const movingEdges = scope.flatMap((p) =>
      worldEdges(p.id, worldShape({ ...p, x: p.x + dx, y: p.y + dy }, shapeFor(p))),
    )
    const fixedEdges = get()
      .pieces.filter((p) => !idSet.has(p.id))
      .flatMap((p) => worldEdges(p.id, worldShape(p, shapeFor(p))))
    let ax = dx
    let ay = dy
    let conn: [string, string] | null = null
    const snap = findSnap(movingEdges, fixedEdges, 4)
    if (snap && snap.dx * dx + snap.dy * dy > 0) {
      ax += snap.dx
      ay += snap.dy
      if (snap.connects) conn = [snap.moving.pieceId, snap.fixed.pieceId]
    } else {
      const { room } = get()
      const walls: [Pt, Pt][] = room.map((p, i) => [p, room[(i + 1) % room.length]])
      const ws = findWallSnap(movingEdges, walls, 4)
      if (ws && ws.dx * dx + ws.dy * dy > 0) {
        ax += ws.dx
        ay += ws.dy
      }
    }
    get().moveScope(
      scope.map((p) => p.id),
      ax,
      ay,
    )
    if (conn) get().connect(conn[0], conn[1])
  },
  rotateSelection(dir) {
    const scope = get().selectionScope()
    if (!scope.length) return
    const anchor = scope.find((p) => p.id === get().selectedId) ?? scope[0]
    get().rotateScopeBy(dir * effectiveRotStep(anchor, get()))
  },
  resetRotation() {
    const scope = get().selectionScope()
    if (!scope.length) return
    const anchor = scope.find((p) => p.id === get().selectedId) ?? scope[0]
    let theta = -anchor.rot % 360
    if (theta <= -180) theta += 360
    if (theta === 0) return
    get().rotateScopeBy(theta)
  },
  rotateScopeBy(theta) {
    const scope = get().selectionScope()
    if (!scope.length || !theta) return
    get().push()
    if (get().solo && scope.length === 1) get().detachPiece(scope[0].id)
    const bb = unitBBox(scope)
    const cx = bb.x + bb.w / 2
    const cy = bb.y + bb.h / 2
    const rad = (theta * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const ids = new Set(scope.map((p) => p.id))
    set((s) => ({
      pieces: s.pieces.map((p) => {
        if (!ids.has(p.id)) return p
        // rotate the piece's bbox center about the scope center, re-derive top-left
        const pb = pieceBBox(p)
        const pcx = pb.x + pb.w / 2
        const pcy = pb.y + pb.h / 2
        const ncx = cx + (pcx - cx) * cos - (pcy - cy) * sin
        const ncy = cy + (pcx - cx) * sin + (pcy - cy) * cos
        const rot = (((p.rot + theta) % 360) + 360) % 360 as Rot
        const nb = bboxOf(worldShape({ ...p, rot, x: 0, y: 0 }, shapeFor(p)).pts)
        return {
          ...p,
          rot,
          x: Math.round((ncx - nb.w / 2) * 2) / 2,
          y: Math.round((ncy - nb.h / 2) * 2) / 2,
        }
      }),
    }))
  },
  reverseSelection() {
    const scope = get().selectionScope()
    if (!scope.length) return
    if (scope.length === 1 && !isReversible(scope[0])) return
    get().push()
    if (get().solo && scope.length === 1) get().detachPiece(scope[0].id)
    const bb = unitBBox(scope)
    const axis = 2 * bb.x + bb.w
    const ids = new Set(scope.map((p) => p.id))
    set((s) => ({
      pieces: s.pieces.map((p) => {
        if (!ids.has(p.id)) return p
        const pb = pieceBBox(p)
        const rot = ((360 - p.rot) % 360) as Rot
        return { ...p, x: axis - (pb.x + pb.w), reversed: !p.reversed, rot }
      }),
    }))
  },
  detachSelected() {
    const { selectedId } = get()
    if (!selectedId) return
    get().push()
    get().detachPiece(selectedId)
    set({ solo: false })
  },
  detachPiece(id) {
    set((s) => ({ connections: s.connections.filter((c) => c.a !== id && c.b !== id) }))
  },
  connect(a, b) {
    if (a === b) return
    const { connections, pieces } = get()
    // only couch pieces join into units — shapes/doors/tables never attach
    if (pieces.find((p) => p.id === a)?.custom || pieces.find((p) => p.id === b)?.custom) return
    if (connections.some((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a))) return
    set((s) => ({ connections: [...s.connections, { a, b }] }))
  },

  setEditRoom(on) {
    set({ editRoom: on, selectedId: null })
  },
  setRoom(pts) {
    set({ room: pts })
  },
  setRoomRect(w, h) {
    get().push()
    const { room } = get()
    const bb = bboxOf(room)
    const sx = w / bb.w
    const sy = h / bb.h
    set({
      room: room.map((p) => ({
        x: Math.round((bb.x + (p.x - bb.x) * sx) * 2) / 2,
        y: Math.round((bb.y + (p.y - bb.y) * sy) * 2) / 2,
      })),
    })
  },
}))
