import type { Snapshot } from './store'

const AUTO_KEY = 'couch-planner:v1:auto'
const SAVES_KEY = 'couch-planner:v1:saves'

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
