import { useEffect, useRef, useState } from 'react'
import Canvas from './components/Canvas'
import Palette from './components/Palette'
import Inspector from './components/Inspector'
import SpecSheet from './components/SpecSheet'
import { stepOptionsWith, useStore } from './store'
import { THEMES, THEME_KEYS } from './themes'
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
  ['Drag empty canvas', 'Pan the view (a motionless click deselects)'],
  ['Scroll wheel / − + ⤢', 'Zoom at the cursor, or use the controls in the canvas corner'],
  ['Arrows / Shift+Arrows', 'Nudge 1″ / 12″ — snaps & connects just like dragging'],
  ['R / Shift+R or ⌘→ / ⌘←', 'Rotate CW / CCW by the piece’s step (couch 90°, shapes 22.5° — change in ⚙)'],
  ['F or ⌥Arrow (Option+Arrow)', 'Reverse (flip L↔R) — reversible pieces, door hinges, whole units'],
  ['Drag blue corner anchor', 'Resize the selected shape/object'],
  ['U', 'Detach selected piece from its unit'],
  ['D', 'Duplicate selection'],
  ['Delete', 'Remove selection'],
  ['⌘Z / ⇧⌘Z', 'Undo / Redo'],
  ['Esc', 'Solo → unit → deselect · closes dialogs'],
  ['?', 'This help'],
]

export default function App() {
  const store = useStore()
  const [showSpec, setShowSpec] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
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
        else if (showSettings) setShowSettings(false)
        else if (s.editRoom) s.setEditRoom(false)
        else if (s.solo) s.select(s.selectedId, false)
        else s.select(null)
        return
      }
      if (showSpec || showHelp || showSettings) return
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
  }, [showSpec, showHelp, showSettings])

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
        <button onClick={() => store.undo()} disabled={store.past.length === 0} title="Undo (⌘Z)">
          ↩︎
        </button>
        <button onClick={() => store.redo()} disabled={store.future.length === 0} title="Redo (⇧⌘Z)">
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
          <option value="">★ Example configs…</option>
          {PRESETS.map((p, i) => (
            <option key={p.name} value={i}>
              {p.name} — {p.dims}
            </option>
          ))}
        </select>
        <select
          value=""
          title="Save/load configurations, room templates, and JSON files"
          onChange={(e) => {
            const v = e.target.value
            e.target.value = ''
            const st = useStore.getState()
            if (v === 'save') doSaveAs()
            else if (v === 'export') exportJSON({ room: st.room, pieces: st.pieces, connections: st.connections })
            else if (v === 'import') fileRef.current?.click()
            else if (v === 'saveroom') {
              const name = prompt('Save room (shape + objects) as template:', 'our living room')
              if (!name) return
              saveRoomTemplate(name, { room: st.room, objects: st.pieces.filter((p) => p.custom) })
              setRoomTpls(listRoomTemplates())
            } else if (v.startsWith('cfg:')) doLoad(v.slice(4))
            else if (v.startsWith('room:')) {
              const t = loadRoomTemplate(v.slice(5))
              if (t) store.applyRoomTemplate(t.room, t.objects)
            } else if (v.startsWith('delcfg:')) {
              deleteNamed(v.slice(7))
              setSaves(listSaves())
            } else if (v.startsWith('delroom:')) {
              deleteRoomTemplate(v.slice(8))
              setRoomTpls(listRoomTemplates())
            }
          }}
        >
          <option value="">📁 File…</option>
          <option value="save">💾 Save configuration…</option>
          <option value="saveroom">🏠 Save room as template…</option>
          <option value="export">⇩ Export JSON</option>
          <option value="import">⇧ Import JSON</option>
          {saves.length > 0 && (
            <optgroup label="Load configuration">
              {saves.map((n) => (
                <option key={n} value={`cfg:${n}`}>
                  {n}
                </option>
              ))}
            </optgroup>
          )}
          {roomTpls.length > 0 && (
            <optgroup label="Load room template">
              {roomTpls.map((n) => (
                <option key={n} value={`room:${n}`}>
                  {n}
                </option>
              ))}
            </optgroup>
          )}
          {(saves.length > 0 || roomTpls.length > 0) && (
            <optgroup label="Delete…">
              {saves.map((n) => (
                <option key={`dc${n}`} value={`delcfg:${n}`}>
                  config “{n}”
                </option>
              ))}
              {roomTpls.map((n) => (
                <option key={`dr${n}`} value={`delroom:${n}`}>
                  room “{n}”
                </option>
              ))}
            </optgroup>
          )}
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
        <button
          className="w-fixed"
          onClick={() => store.toggleUnits()}
          title="Toggle dimension display: inches vs feet + inches"
        >
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
        <button onClick={() => setShowSettings(true)} title="Settings">
          ⚙
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
      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>⚙ Settings</h2>
            <h3>Canvas theme</h3>
            <div className="theme-row">
              {THEME_KEYS.map((k) => {
                const th = THEMES[k]
                return (
                  <button
                    key={k}
                    className={`theme-swatch${store.theme === k ? ' active' : ''}`}
                    onClick={() => store.setTheme(k)}
                    title={th.label}
                  >
                    <svg width={64} height={44}>
                      <rect width={64} height={44} fill={th.workspace} rx={4} />
                      <rect x={8} y={7} width={48} height={30} fill={th.roomFill} stroke={th.wall} strokeWidth={2} />
                      <rect x={13} y={12} width={20} height={9} fill={th.sofaFill} stroke={th.stroke} />
                      <rect x={36} y={12} width={9} height={17} fill={th.sofaFill} stroke={th.stroke} />
                    </svg>
                    <small>{th.label}</small>
                  </button>
                )
              })}
            </div>
            <h3>Rotation steps</h3>
            <div className="settings-row">
              <label>
                Couch pieces
                <select
                  value={store.rotStepPieces}
                  onChange={(e) => store.setRotSteps(Number(e.target.value), store.rotStepShapes)}
                >
                  {stepOptionsWith(store.rotStepPieces).map((v) => (
                    <option key={v} value={v}>
                      {v}°
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Shapes &amp; objects
                <select
                  value={store.rotStepShapes}
                  onChange={(e) => store.setRotSteps(store.rotStepPieces, Number(e.target.value))}
                >
                  {stepOptionsWith(store.rotStepShapes).map((v) => (
                    <option key={v} value={v}>
                      {v}°
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="hint">
              R and ⌘-arrows rotate by these steps. A selected piece can override its own step in the side panel.
            </p>
            <button className="primary" onClick={() => setShowSettings(false)}>
              Done
            </button>
          </div>
        </div>
      )}
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
