export interface Pt {
  x: number
  y: number
}

/** Edge semantics in a piece's canonical orientation (back at top, y down). */
export type EdgeKind = 'back' | 'arm' | 'front' | 'open'

export type Category = 'SOFAS' | 'SECTIONALS' | 'OTTOS' | 'OBJECTS'

/** Polygon in canonical space, points clockwise; kinds[i] describes edge pts[i] -> pts[i+1]. */
export interface Shape {
  pts: Pt[]
  kinds: EdgeKind[]
}

export interface PieceDef {
  id: string // '11'
  code: string // '11L' as printed on the sheet
  name: string
  category: Category
  w: number // "L" on the sheet, inches
  d: number // "D" on the sheet, inches
  reversible: boolean // starred on sheet (or noted reversible)
  hand?: 'L' | 'R' // handedness as printed
  shape: Shape
  note?: string
}

export interface CustomSpec {
  kind: 'rect' | 'ellipse'
  w: number
  d: number
}

export type Rot = 0 | 90 | 180 | 270

export interface Placed {
  id: string
  defId?: string
  custom?: CustomSpec
  label?: string
  x: number // world top-left of bounding box, inches
  y: number
  rot: Rot
  reversed: boolean
}

export interface Conn {
  a: string
  b: string
}

export interface BBox {
  x: number
  y: number
  w: number
  h: number
}

export interface WorldEdge {
  pieceId: string
  index: number
  a: Pt
  b: Pt
  kind: EdgeKind
}
