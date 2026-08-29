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
  /** decorative polylines (seat fronts, door swing arcs) that transform with the piece */
  decor?: Pt[][]
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
  /** approximate adult seating capacity (chaise/cuddler count as seats) */
  seats?: number
}

export interface CustomSpec {
  kind: 'rect' | 'ellipse' | 'door' | 'poly'
  w: number
  d: number
  /** number of sides for kind 'poly' (3..24); 4 = rectangle */
  sides?: number
}

/** rotation in degrees, clockwise, any angle */
export type Rot = number

export interface Placed {
  id: string
  defId?: string
  custom?: CustomSpec
  label?: string
  x: number // world top-left of bounding box, inches
  y: number
  rot: Rot
  reversed: boolean
  /** per-piece rotation step override in degrees (else category default applies) */
  rotStep?: number
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
