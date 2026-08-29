import { useEffect, useRef, useState } from 'react'
import Canvas from './components/Canvas'
import Palette from './components/Palette'
import Inspector from './components/Inspector'
import SpecSheet from './components/SpecSheet'
import { useStore } from './store'
import { PRESETS } from './presets'
import {
  deleteNamed,
  deleteRoomTemplate,
  exportJSON,
  importJSON,
  listRoomTemplates,
  listSaves,
  loadAuto,
  loadNamed,
  loadRoomTemplate,
  saveAuto,
  saveNamed,
  saveRoomTemplate,
} from './storage'
import './App.css'

const HOTKEYS: [string, string][] = [
  ['Tab / Shift+Tab', 'Cycle through units'],
  ['Click', 'Select a unit (connected pieces move together)'],
  ['Double-click / ⌥-click', 'Select a single piece inside a unit'],
  ['Drag', 'Move — green edges glow when a snap-connect is possible'],
  ['Arrows / Shift+Arrows', 'Nudge 1″ / 12″'],
  ['R / Shift+R', 'Rotate 90° CW / CCW'],
  ['⌘→ / ⌘← (Cmd+Arrows)', 'Rotate CW / CCW by the piece’s step (couch 90°, shapes 22.5° by default)'],
  ['Space+drag / middle-drag', 'Pan the view (plain background drag no longer pans)'],
  ['F or ⌥Arrow (Option+Arrow)', 'Reverse (flip L↔R) — reversible pieces & whole units'],
  ['U', 'Detach selected piece from its unit'],
  ['D', 'Duplicate selection'],
  ['Delete', 'Remove selection'],
  ['⌘Z / ⇧⌘Z', 'Undo / Redo'],
  ['Esc', 'Drop to unit selection → deselect'],
  ['?', 'This help'],
]

export default function App() {
  const store = useStore()
  const [showSpec, setShowSpec] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [saves, setSaves] = useState<string[]>([])
  const [roomTpls, setRoomTpls] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const booted = useRef(false)

  // boot: restore autosave
  useEffect(() => {
    if (booted.current) return
    booted.current = true
    const auto = loadAuto()
    if (auto && auto.pieces) useStore.setState({ ...auto })
    setSaves(listSaves())
    setRoomTpls(listRoomTemplates())
  }, [])

  // autosave
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const unsub = useStore.subscribe((s, prev) => {
      if (s.pieces === prev.pieces && s.room === prev.room && s.connections === prev.connections) return
      clearTimeout(t)
      t = setTimeout(() => saveAuto({ room: s.room, pieces: s.pieces, connections: s.connections }), 400)
    })
    return () => {
      unsub()
      clearTimeout(t)
    }
  }, [])

  // hotkeys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const s = useStore.getState()
      if (e.key === 'Escape') {
        if (showSpec) setShowSpec(false)
        else if (showHelp) setShowHelp(false)
        else if (s.editRoom) s.setEditRoom(false)
        else if (s.solo) s.select(s.selectedId, false)
        else s.select(null)
        return
      }
      if (showSpec || showHelp) return
      if (e.key === 'Tab') {
        e.preventDefault()
        s.tabSelect(e.shiftKey ? -1 : 1)
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        e.shiftKey ? s.redo() : s.undo()
      } else if (e.key === 'r' || e.key === 'R') {
        s.rotateSelection(e.shiftKey ? -1 : 1)
      } else if (e.key === 'f' || e.key === 'F') {
        s.reverseSelection()
      } else if (e.key === 'u' || e.key === 'U') {
        s.detachSelected()
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        s.duplicateSelection()
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        s.deleteSelection()
      } else if (e.key === '?') {
        setShowHelp(true)
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault()
        if (e.ctrlKey || e.metaKey) {
          s.rotateSelection(e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 1)
        } else if (e.altKey) {
          s.reverseSelection()
        } else {
          const step = e.shiftKey ? 12 : 1
          const d: Record<string, [number, number]> = {
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
          }
          const [dx, dy] = d[e.key]
          s.nudge(dx, dy)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showSpec, showHelp])

  function doSaveAs() {
    const name = prompt('Save configuration as:', 'living room v1')
    if (!name) return
    const { room, pieces, connections } = useStore.getState()
    saveNamed(name, { room, pieces, connections })
    setSaves(listSaves())
  }

  function doLoad(name: string) {
    const snap = loadNamed(name)
    if (snap) store.loadSnapshot(snap)
  }

  return (
    <div className="app">
      <div className="toolbar">
        <span className="brand">
          🛋 Sectional Planner <small>Cascade modular</small>
        </span>
        <button onClick={() => store.undo()} title="Undo (⌘Z)">
          ↩︎
        </button>
        <button onClick={() => store.redo()} title="Redo (⇧⌘Z)">
          ↪︎
        </button>
        <span className="spacer" />
        <select
          value=""
          title="The six configurations pre-drawn on the spec sheet (replaces current pieces, keeps your room)"
          onChange={(e) => {
            const p = PRESETS[Number(e.target.value)]
            if (p) {
              const { pieces, connections } = p.build()
              store.setLayout(pieces, connections)
            }
            e.target.value = ''
          }}
        >
          <option value="">★ Sheet configs…</option>
          {PRESETS.map((p, i) => (
            <option key={p.name} value={i}>
              {p.name} — {p.dims}
            </option>
          ))}
        </select>
        <button onClick={doSaveAs}>💾 Save</button>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value.startsWith('load:')) doLoad(e.target.value.slice(5))
            else if (e.target.value.startsWith('del:')) {
              deleteNamed(e.target.value.slice(4))
              setSaves(listSaves())
            }
          }}
        >
          <option value="">📂 Load…</option>
          {saves.map((n) => (
            <option key={n} value={`load:${n}`}>
              {n}
            </option>
          ))}
          {saves.map((n) => (
            <option key={`d${n}`} value={`del:${n}`}>
              🗑 delete “{n}”
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            const { room, pieces, connections } = useStore.getState()
            exportJSON({ room, pieces, connections })
          }}
        >
          ⇩ Export
        </button>
        <button onClick={() => fileRef.current?.click()}>⇧ Import</button>
        <select
          value=""
          title="Room templates: save your room shape + fixed objects (doors, tables) and reuse it across couch configs"
          onChange={(e) => {
            const v = e.target.value
            e.target.value = ''
            if (v === 'save') {
              const name = prompt('Save room (shape + objects) as template:', 'our living room')
              if (!name) return
              const { room, pieces } = useStore.getState()
              saveRoomTemplate(name, { room, objects: pieces.filter((p) => p.custom) })
              setRoomTpls(listRoomTemplates())
            } else if (v.startsWith('load:')) {
              const t = loadRoomTemplate(v.slice(5))
              if (t) store.applyRoomTemplate(t.room, t.objects)
            } else if (v.startsWith('del:')) {
              deleteRoomTemplate(v.slice(4))
              setRoomTpls(listRoomTemplates())
            }
          }}
        >
          <option value="">🏠 Rooms…</option>
          <option value="save">💾 Save current room as template</option>
          {roomTpls.map((n) => (
            <option key={n} value={`load:${n}`}>
              {n}
            </option>
          ))}
          {roomTpls.map((n) => (
            <option key={`d${n}`} value={`del:${n}`}>
              🗑 delete “{n}”
            </option>
          ))}
        </select>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) store.loadSnapshot(await importJSON(f))
            e.target.value = ''
          }}
        />
        <span className="spacer" />
        <button onClick={() => store.toggleUnits()} title="Toggle dimension display: inches vs feet + inches">
          📏 {store.units === 'in' ? 'inches' : 'ft + in'}
        </button>
        <button
          className={store.showClearance ? 'primary' : ''}
          onClick={() => store.toggleClearance()}
          title="Show walkway clearances: red < 24″, amber < 36″, green ≥ 36″"
        >
          🚶 Clearance
        </button>
        <button className="primary" onClick={() => setShowSpec(true)}>
          📄 Spec Sheet / PDF
        </button>
        <button onClick={() => setShowHelp(true)} title="Hotkeys">
          ?
        </button>
      </div>
      <div className="main">
        <Palette />
        <Canvas />
        <Inspector />
      </div>
      {showSpec && <SpecSheet onClose={() => setShowSpec(false)} />}
      {showHelp && (
        <div className="modal-backdrop" onClick={() => setShowHelp(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Hotkeys &amp; tips</h2>
            <table>
              <tbody>
                {HOTKEYS.map(([k, v]) => (
                  <tr key={k}>
                    <td>
                      <kbd>{k}</kbd>
                    </td>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="primary" onClick={() => setShowHelp(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
