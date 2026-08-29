import type { Conn, Placed, Rot } from './types'
import { newId } from './store'

/**
 * The six pre-drawn configurations from the sheet's CONFIGURATIONS section,
 * placed with the same geometry so each reproduces its printed overall dims.
 */
export interface Preset {
  name: string
  dims: string
  overall: [number, number]
  build(): { pieces: Placed[]; connections: Conn[] }
}

const OX = 24
const OY = 18

function at(defId: string, x: number, y: number, rot: Rot, reversed = false): Placed {
  return { id: newId(), defId, x: x + OX, y: y + OY, rot, reversed }
}

function chain(pieces: Placed[]): Conn[] {
  const conns: Conn[] = []
  for (let i = 1; i < pieces.length; i++) conns.push({ a: pieces[i - 1].id, b: pieces[i].id })
  return conns
}

export const PRESETS: Preset[] = [
  {
    name: 'As Shown: 10L + 32 + 21R',
    dims: '168″ × 107″',
    overall: [168, 107],
    build() {
      const pieces = [at('10', 0, 0, 270), at('32', 43, 0, 0), at('21', 125, 0, 0)]
      return { pieces, connections: chain(pieces) }
    },
  },
  {
    name: '12L + 75R',
    dims: '135″ × 74″',
    overall: [135, 74],
    build() {
      const pieces = [at('12', 0, 0, 0), at('75', 65, 0, 0)]
      return { pieces, connections: chain(pieces) }
    },
  },
  {
    name: '45L + 10R',
    dims: '135″ × 107″',
    overall: [135, 107],
    build() {
      const pieces = [at('45', 0, 0, 0, true), at('10', 92, 0, 90, true)]
      return { pieces, connections: chain(pieces) }
    },
  },
  {
    name: '11R + 10L',
    dims: '135″ × 107″',
    overall: [135, 107],
    build() {
      const pieces = [at('11', 0, 64, 180, true), at('10', 92, 0, 90)]
      return { pieces, connections: chain(pieces) }
    },
  },
  {
    name: '95L + 31 + 21R',
    dims: '141″ × 80″',
    overall: [141, 80],
    build() {
      const pieces = [at('95', 0, 0, 270), at('31', 43, 0, 0), at('21', 98, 0, 0)]
      return { pieces, connections: chain(pieces) }
    },
  },
  {
    name: '12R + 41 + 12L',
    dims: '119″ × 119″',
    overall: [119, 119],
    build() {
      const pieces = [at('12', 0, 0, 270, true), at('41', 0, 65, 270), at('12', 54, 76, 180)]
      return { pieces, connections: chain(pieces) }
    },
  },
]
