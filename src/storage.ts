import type { Snapshot } from './store'
import type { Placed, Pt } from './types'

const AUTO_KEY = 'couch-planner:v1:auto'
const SAVES_KEY = 'couch-planner:v1:saves'
const ROOMS_KEY = 'couch-planner:v1:rooms'

export interface RoomTemplate {
  room: Pt[]
  objects: Placed[] // custom objects only (doors, tables…) — no couch pieces
}

export function loadAuto(): Snapshot | null {
  try {
    const raw = localStorage.getItem(AUTO_KEY)
    return raw ? (JSON.parse(raw) as Snapshot) : null
  } catch {
    return null
  }
}

export function saveAuto(s: Snapshot): void {
  try {
    localStorage.setItem(AUTO_KEY, JSON.stringify(s))
  } catch {
    /* storage full or unavailable — ignore */
  }
}

export function listSaves(): string[] {
  try {
    return Object.keys(JSON.parse(localStorage.getItem(SAVES_KEY) || '{}')).sort()
  } catch {
    return []
  }
}

export function saveNamed(name: string, s: Snapshot): void {
  const all = JSON.parse(localStorage.getItem(SAVES_KEY) || '{}')
  all[name] = s
  localStorage.setItem(SAVES_KEY, JSON.stringify(all))
}

export function loadNamed(name: string): Snapshot | null {
  try {
    const all = JSON.parse(localStorage.getItem(SAVES_KEY) || '{}')
    return all[name] ?? null
  } catch {
    return null
  }
}

export function deleteNamed(name: string): void {
  const all = JSON.parse(localStorage.getItem(SAVES_KEY) || '{}')
  delete all[name]
  localStorage.setItem(SAVES_KEY, JSON.stringify(all))
}

export function listRoomTemplates(): string[] {
  try {
    return Object.keys(JSON.parse(localStorage.getItem(ROOMS_KEY) || '{}')).sort()
  } catch {
    return []
  }
}

export function saveRoomTemplate(name: string, t: RoomTemplate): void {
  const all = JSON.parse(localStorage.getItem(ROOMS_KEY) || '{}')
  all[name] = t
  localStorage.setItem(ROOMS_KEY, JSON.stringify(all))
}

export function loadRoomTemplate(name: string): RoomTemplate | null {
  try {
    const all = JSON.parse(localStorage.getItem(ROOMS_KEY) || '{}')
    return all[name] ?? null
  } catch {
    return null
  }
}

export function deleteRoomTemplate(name: string): void {
  const all = JSON.parse(localStorage.getItem(ROOMS_KEY) || '{}')
  delete all[name]
  localStorage.setItem(ROOMS_KEY, JSON.stringify(all))
}

export function exportJSON(s: Snapshot): void {
  const blob = new Blob([JSON.stringify({ v: 1, ...s }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'couch-config.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function importJSON(file: File): Promise<Snapshot> {
  return file.text().then((t) => {
    const j = JSON.parse(t)
    if (!j.room || !j.pieces) throw new Error('not a couch-config file')
    return { room: j.room, pieces: j.pieces, connections: j.connections ?? [] }
  })
}
