import type { EdgeKind, PieceDef, Placed, Shape, CustomSpec } from './types'

/**
 * Catalog transcribed from the Cascade Furniture spec sheet (printed 10/11/2023).
 * All dims in inches. Canonical orientation: back at top, y down.
 * Global: sofa height 38", seat height 22", seat depth 25", arm height 26".
 */

const BODY_D = 43
const CHAISE_D = 69
const CHAISE_W = 30 // approx chaise footprint width on sofa-chaise pieces

function rect(w: number, d: number, left: EdgeKind, right: EdgeKind, back: EdgeKind = 'back'): Shape {
  return {
    pts: [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: d },
      { x: 0, y: d },
    ],
    kinds: [back, right, 'front', left],
  }
}

/** Sofa body (depth 43) with a chaise extending to depth 69 on the right end. */
function chaiseRight(w: number, left: EdgeKind, right: EdgeKind): Shape {
  return {
    pts: [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: CHAISE_D },
      { x: w - CHAISE_W, y: CHAISE_D },
      { x: w - CHAISE_W, y: BODY_D },
      { x: 0, y: BODY_D },
    ],
    kinds: ['back', right, 'front', 'front', 'front', left],
  }
}

/** 75R angled cuddler, approximated: back 70 wide, angled front, open left edge. */
function cuddlerRight(): Shape {
  return {
    pts: [
      { x: 0, y: 0 },
      { x: 70, y: 0 },
      { x: 70, y: 38 },
      { x: 32, y: 74 },
      { x: 0, y: 74 },
    ],
    kinds: ['back', 'arm', 'front', 'front', 'open'],
    // seat-front line paralleling the angled face so the 45° seat reads at a glance
    decor: [
      [
        { x: 61, y: 29 },
        { x: 24, y: 65 },
      ],
    ],
  }
}

function def(
  id: string,
  code: string,
  name: string,
  category: PieceDef['category'],
  w: number,
  d: number,
  reversible: boolean,
  shape: Shape,
  extra?: Partial<PieceDef>,
): PieceDef {
  const hand = /L$/.test(code) ? 'L' : /R$/.test(code) ? 'R' : undefined
  return { id, code, name, category, w, d, reversible, hand, shape, ...extra }
}

export const CATALOG: PieceDef[] = [
  // ---- SOFAS ----
  def('01', '01', 'Sofa', 'SOFAS', 99, BODY_D, false, rect(99, BODY_D, 'arm', 'arm')),
  def('02', '02', 'Loveseat', 'SOFAS', 73, BODY_D, false, rect(73, BODY_D, 'arm', 'arm')),
  def('44', '44', 'Double Chair', 'SOFAS', 65, BODY_D, false, rect(65, BODY_D, 'arm', 'arm')),
  def('81', '81', '3 Cushion Sofa', 'SOFAS', 102, BODY_D, false, rect(102, BODY_D, 'arm', 'arm')),
  def('33', '33', 'Sofa Chaise', 'SOFAS', 102, CHAISE_D, true, chaiseRight(102, 'arm', 'arm'), {
    note: 'Chaise cushions reversible; ottoman moves to opposite side',
  }),
  def('97', '97', 'Sofa Chaise w/ Stor.', 'SOFAS', 102, CHAISE_D, true, chaiseRight(102, 'arm', 'arm'), {
    note: 'Storage in chaise; cushions reversible',
  }),

  // ---- SECTIONALS ----
  def('10', '10L', 'Tux Sofa', 'SECTIONALS', 107, BODY_D, true, rect(107, BODY_D, 'arm', 'open')),
  def('11', '11L', '1 Arm Sofa', 'SECTIONALS', 92, BODY_D, true, rect(92, BODY_D, 'arm', 'open')),
  def('32', '32', 'Armless Sofa', 'SECTIONALS', 82, BODY_D, false, rect(82, BODY_D, 'open', 'open')),
  def('45', '45R', '1 Arm Sofa Chaise', 'SECTIONALS', 92, CHAISE_D, true, chaiseRight(92, 'open', 'arm')),
  def('50', '50R', '1 Arm Sofa Chaise w/ Stor.', 'SECTIONALS', 92, CHAISE_D, true, chaiseRight(92, 'open', 'arm'), {
    note: 'Storage in chaise',
  }),
  def('95', '95L', 'Tux Loveseat', 'SECTIONALS', 80, BODY_D, true, rect(80, BODY_D, 'arm', 'open')),
  def('12', '12L', '1 Arm Loveseat', 'SECTIONALS', 65, BODY_D, true, rect(65, BODY_D, 'arm', 'open')),
  def('31', '31', 'Armless Loveseat', 'SECTIONALS', 55, BODY_D, false, rect(55, BODY_D, 'open', 'open')),
  def('17', '17', 'Corner Chair', 'SECTIONALS', 43, 43, false, corner(43), {
    note: 'Backs on two sides; connects on the other two',
  }),
  def('24', '24L', '1 Arm Chair', 'SECTIONALS', 38, BODY_D, true, rect(38, BODY_D, 'arm', 'open')),
  def('18', '18', 'Armless Chair', 'SECTIONALS', 28, BODY_D, false, rect(28, BODY_D, 'open', 'open')),
  def('41', '41', 'Corner Wedge', 'SECTIONALS', 54, 54, false, corner(54, true), {
    note: 'Angled seat; turns a run 90°',
  }),
  def('21', '21R', '1 Arm Chaise', 'SECTIONALS', 43, CHAISE_D, true, rect(43, CHAISE_D, 'open', 'arm')),
  def('75', '75R', '1 Arm Angled Cuddler', 'SECTIONALS', 70, 74, true, cuddlerRight()),

  // ---- OTTOS ---- (all four sides connectable — ottomans butt against anything)
  def('67', '67', 'XL Sq. Cktl Ottoman', 'OTTOS', 50, 50, false, allOpen(50, 50)),
  def('29', '29', 'Cocktail Otto.', 'OTTOS', 39, 39, false, allOpen(39, 39)),
  def('35', '35', 'Storage Otto.', 'OTTOS', 38, 38, false, allOpen(38, 38)),
  def('43', '43', 'Rect. Otto.', 'OTTOS', 49, 27, false, allOpen(49, 27)),
  def('47', '47', 'Rect. Storage Otto.', 'OTTOS', 49, 27, false, allOpen(49, 27)),
]

function allOpen(w: number, d: number): Shape {
  const s = rect(w, d, 'open', 'open', 'open')
  s.kinds = s.kinds.map(() => 'open')
  return s
}

/** Corner piece: backs on top+left, connectable on right+front. */
function corner(size: number, angled = false): Shape {
  const s = rect(size, size, 'back', 'open', 'back')
  s.kinds[2] = 'open' // front face also connects — corners join two runs
  if (angled) {
    // diagonal back-cushion and seat-front lines: the wedge's angled seat
    const a = size * 0.26
    const b = size * 0.93
    s.decor = [
      [
        { x: b, y: a },
        { x: a, y: b },
      ],
      [
        { x: size * 0.98, y: size * 0.55 },
        { x: size * 0.55, y: size * 0.98 },
      ],
    ]
  }
  return s
}

/** Approximate adult seating capacity per piece (from seat widths; chaise/cuddler = seats). */
const SEATS: Record<string, number> = {
  '01': 3, '02': 2, '44': 2, '81': 3, '33': 3, '97': 3,
  '10': 3, '11': 3, '32': 3, '45': 3, '50': 3, '95': 2,
  '12': 2, '31': 2, '17': 1, '24': 1, '18': 1, '41': 1,
  '21': 1, '75': 2,
}
for (const d of CATALOG) d.seats = SEATS[d.id] ?? 0

export const catalogById = new Map(CATALOG.map((d) => [d.id, d]))

/** Minimum clear approach depth in front of a doorway, inches. */
export const DOOR_CLEARANCE = 32

/** Canonical keep-clear zone in front of a door opening (swing side). */
export function doorZonePts(c: CustomSpec): { x: number; y: number }[] {
  const depth = Math.max(DOOR_CLEARANCE, c.w)
  return [
    { x: 0, y: c.d },
    { x: c.w, y: c.d },
    { x: c.w, y: c.d + depth },
    { x: 0, y: c.d + depth },
  ]
}

export function customShape(c: CustomSpec): Shape {
  if (c.kind === 'door') {
    // opening in the wall (jamb rect) + swing arc and door leaf as decor.
    // hinge at bottom-left of the jamb; F (reverse) flips the hinge side.
    const arc: { x: number; y: number }[] = []
    for (let i = 0; i <= 12; i++) {
      const t = (i / 12) * (Math.PI / 2)
      arc.push({ x: Math.cos(t) * c.w, y: c.d + Math.sin(t) * c.w })
    }
    return {
      pts: [
        { x: 0, y: 0 },
        { x: c.w, y: 0 },
        { x: c.w, y: c.d },
        { x: 0, y: c.d },
      ],
      kinds: ['front', 'front', 'front', 'front'], // doors don't snap-connect to couches
      decor: [
        arc,
        [
          { x: 0, y: c.d },
          { x: 0, y: c.d + c.w },
        ],
      ],
    }
  }
  if (c.kind === 'rect') {
    return {
      pts: [
        { x: 0, y: 0 },
        { x: c.w, y: 0 },
        { x: c.w, y: c.d },
        { x: 0, y: c.d },
      ],
      kinds: ['open', 'open', 'open', 'open'],
    }
  }
  // ellipse approximated by a polygon; edges not connectable
  const N = 24
  const pts = []
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2
    pts.push({ x: (c.w / 2) * (1 + Math.cos(t)), y: (c.d / 2) * (1 + Math.sin(t)) })
  }
  return { pts, kinds: pts.map(() => 'front' as EdgeKind) }
}

export function shapeFor(p: Placed): Shape {
  if (p.custom) return customShape(p.custom)
  const d = catalogById.get(p.defId!)
  if (!d) throw new Error(`unknown def ${p.defId}`)
  return d.shape
}

/** Display code with handedness reflecting the reversed flag (11L reversed -> 11R). */
export function displayCode(p: Placed): string {
  if (p.custom) return p.label || (p.custom.kind === 'rect' ? 'Box' : p.custom.kind === 'door' ? 'Door' : 'Oval')
  const d = catalogById.get(p.defId!)!
  if (!d.hand) return d.code
  const hand = p.reversed ? (d.hand === 'L' ? 'R' : 'L') : d.hand
  return d.code.replace(/[LR]$/, hand)
}

export function defFor(p: Placed): PieceDef | undefined {
  return p.defId ? catalogById.get(p.defId) : undefined
}

/** Total approximate seats across a set of placed pieces. */
export function unitSeats(pieces: Placed[]): number {
  return pieces.reduce((n, p) => n + (defFor(p)?.seats ?? 0), 0)
}

export function isReversible(p: Placed): boolean {
  if (p.custom) return p.custom.kind !== 'ellipse' // doors flip their hinge side
  return defFor(p)?.reversible ?? false
}
