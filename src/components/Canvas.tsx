import { useEffect, useMemo, useRef, useState } from 'react'
import type { Placed, Pt, WorldEdge } from '../types'
import { bboxOf, fmtLen, polysOverlap, rectsIntersect, worldAux, worldEdges, worldShape, centroid } from '../geometry'
import { findSnap, findWallSnap, unitOf, components } from '../connect'
import { clearanceGaps, gapColor } from '../clearance'
import { defFor, displayCode, doorZonePts, isReversible, shapeFor, DOOR_CLEARANCE } from '../catalog'
import { pieceBBox, unitBBox, useStore } from '../store'
import { THEMES, type CanvasTheme } from '../themes'

interface View {
  scale: number
  tx: number
  ty: number
}

type DragState =
  | { mode: 'piece'; ids: string[]; start: Pt; orig: Map<string, Pt>; moved: boolean; pushed: boolean }
  | { mode: 'pan'; startScreen: Pt; origView: View }
  | { mode: 'vertex'; index: number; pushed: boolean }
  | { mode: 'edge'; index: number; start: Pt; origRoom: Pt[]; pushed: boolean }
  | { mode: 'resize'; id: string; start: Pt; origW: number; origD: number; rot: number; reversed: boolean; pushed: boolean }

function safeCapture(e: React.PointerEvent) {
  try {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  } catch {
    /* stale or synthetic pointer — capture is best-effort */
  }
}

export function geometryOf(p: Placed) {
  const s = worldShape(p, shapeFor(p))
  return { shape: s, edges: worldEdges(p.id, s) }
}

export default function Canvas() {
  const store = useStore()
  const { room, pieces, connections, selectedId, solo, editRoom } = store
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<View>({ scale: 3, tx: 40, ty: 40 })
  const [size, setSize] = useState({ w: 800, h: 600 })
  const dragRef = useRef<DragState | null>(null)
  const [snapHint, setSnapHint] = useState<{ a: WorldEdge; b: WorldEdge } | null>(null)
  const userZoomed = useRef(false)

  const roomBB = useMemo(() => bboxOf(room), [room])
  const F = (v: number) => fmtLen(v, store.units)
  const T = THEMES[store.theme] ?? THEMES.cream
  const defaultScale = useRef(1)

  // default view: room fitted then pulled back 25% inside the endless grid
  const fitView = (): View => {
    const pad = 52
    const scale = Math.min((size.w - pad * 2) / roomBB.w, (size.h - pad * 2) / roomBB.h) * 0.75
    return {
      scale,
      tx: (size.w - roomBB.w * scale) / 2 - roomBB.x * scale,
      ty: (size.h - roomBB.h * scale) / 2 - roomBB.y * scale,
    }
  }

  useEffect(() => {
    const v = fitView()
    if (!isFinite(v.scale) || v.scale <= 0) return
    defaultScale.current = v.scale
    if (!userZoomed.current) setView(v)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomBB, size])

  const zoomAt = (mx: number, my: number, factor: number) => {
    userZoomed.current = true
    setView((v) => {
      const scale = Math.min(20, Math.max(0.3, v.scale * factor))
      const k = scale / v.scale
      return { scale, tx: mx - (mx - v.tx) * k, ty: my - (my - v.ty) * k }
    })
  }

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const toWorld = (e: { clientX: number; clientY: number }): Pt => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left - view.tx) / view.scale, y: (e.clientY - r.top - view.ty) / view.scale }
  }

  const geoms = useMemo(() => {
    const m = new Map<string, ReturnType<typeof geometryOf>>()
    for (const p of pieces) m.set(p.id, geometryOf(p))
    return m
  }, [pieces])

  const overlapping = useMemo(() => {
    const bad = new Set<string>()
    for (let i = 0; i < pieces.length; i++)
      for (let j = i + 1; j < pieces.length; j++) {
        if (polysOverlap(geoms.get(pieces[i].id)!.shape.pts, geoms.get(pieces[j].id)!.shape.pts)) {
          bad.add(pieces[i].id)
          bad.add(pieces[j].id)
        }
      }
    return bad
  }, [pieces, geoms])

  const units = useMemo(
    () => components(pieces.map((p) => p.id), connections),
    [pieces, connections],
  )
  const selectedUnit = selectedId ? units.find((u) => u.includes(selectedId)) : undefined

  const gaps = useMemo(() => {
    if (!store.showClearance) return []
    const doorIds = new Set(pieces.filter((p) => p.custom?.kind === 'door').map((p) => p.id))
    const boxes = units
      .filter((u) => !u.some((id) => doorIds.has(id))) // doors get their own 32" rule
      .map((u) => unitBBox(pieces.filter((p) => u.includes(p.id))))
    return clearanceGaps(boxes, room)
  }, [units, pieces, room, store.showClearance])

  const doorZones = useMemo(() => {
    return pieces
      .filter((p) => p.custom?.kind === 'door')
      .map((door) => {
        const zone = worldAux(door, shapeFor(door), doorZonePts(door.custom!))
        const zbb = bboxOf(zone)
        const blocked = pieces.some(
          (q) => q.id !== door.id && q.custom?.kind !== 'door' && rectsIntersect(pieceBBox(q), zbb, 1),
        )
        return { id: door.id, zone, blocked }
      })
  }, [pieces])

  // ---------- interaction ----------
  function onPiecePointerDown(e: React.PointerEvent, p: Placed) {
    if (editRoom) return
    e.stopPropagation()
    safeCapture(e)
    const wantSolo = solo && selectedId === p.id ? true : e.altKey
    store.select(p.id, wantSolo)
    const scopeIds = wantSolo ? [p.id] : unitOf(p.id, pieces.map((q) => q.id), connections)
    const orig = new Map<string, Pt>()
    for (const q of pieces) if (scopeIds.includes(q.id)) orig.set(q.id, { x: q.x, y: q.y })
    dragRef.current = { mode: 'piece', ids: scopeIds, start: toWorld(e), orig, moved: false, pushed: false }
  }

  function onBackgroundPointerDown(e: React.PointerEvent) {
    if (editRoom) return
    // drag empty canvas to pan; a plain click (no movement) deselects on release
    safeCapture(e)
    dragRef.current = { mode: 'pan', startScreen: { x: e.clientX, y: e.clientY }, origView: view }
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d) return
    if (d.mode === 'pan') {
      const dx = e.clientX - d.startScreen.x
      const dy = e.clientY - d.startScreen.y
      if (Math.hypot(dx, dy) > 2) userZoomed.current = true
      setView({ ...d.origView, tx: d.origView.tx + dx, ty: d.origView.ty + dy })
      return
    }
    if (d.mode === 'resize') {
      if (!d.pushed) {
        store.push()
        d.pushed = true
      }
      const w = toWorld(e)
      const rad = (-d.rot * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      let ldx = (w.x - d.start.x) * cos - (w.y - d.start.y) * sin
      const ldy = (w.x - d.start.x) * sin + (w.y - d.start.y) * cos
      if (d.reversed) ldx = -ldx
      store.resizeCustom(d.id, Math.round(d.origW + ldx), Math.round(d.origD + ldy))
      return
    }
    if (d.mode === 'vertex') {
      if (!d.pushed) {
        store.push()
        d.pushed = true
      }
      const w = toWorld(e)
      let nx = Math.round(w.x)
      let ny = Math.round(w.y)
      // keep walls square: snap to neighbor corners' axes
      const prev = room[(d.index + room.length - 1) % room.length]
      const next = room[(d.index + 1) % room.length]
      for (const nb of [prev, next]) {
        if (Math.abs(nb.x - nx) <= 4) nx = nb.x
        if (Math.abs(nb.y - ny) <= 4) ny = nb.y
      }
      const pts = room.map((p, i) => (i === d.index ? { x: nx, y: ny } : p))
      store.setRoom(pts)
      return
    }
    if (d.mode === 'edge') {
      if (!d.pushed) {
        store.push()
        d.pushed = true
      }
      const w = toWorld(e)
      const a = d.origRoom[d.index]
      const b = d.origRoom[(d.index + 1) % d.origRoom.length]
      const ex = b.x - a.x
      const ey = b.y - a.y
      const len = Math.hypot(ex, ey) || 1
      const nx = ey / len
      const ny = -ex / len
      const t = (w.x - d.start.x) * nx + (w.y - d.start.y) * ny
      const pts = d.origRoom.map((p, i) =>
        i === d.index || i === (d.index + 1) % d.origRoom.length
          ? { x: Math.round(p.x + nx * t), y: Math.round(p.y + ny * t) }
          : p,
      )
      store.setRoom(pts)
      return
    }
    // piece drag
    const w = toWorld(e)
    let dx = Math.round(w.x - d.start.x)
    let dy = Math.round(w.y - d.start.y)
    if (!d.moved && Math.hypot(dx, dy) < 1) return
    if (!d.moved) {
      d.moved = true
      if (!d.pushed) {
        store.push()
        d.pushed = true
      }
      if (d.ids.length === 1 && solo) store.detachPiece(d.ids[0])
    }
    // proposed geometry
    const idSet = new Set(d.ids)
    const movingEdges: WorldEdge[] = []
    for (const p of pieces) {
      if (!idSet.has(p.id)) continue
      const o = d.orig.get(p.id)!
      const proposed = { ...p, x: o.x + dx, y: o.y + dy }
      movingEdges.push(...worldEdges(p.id, worldShape(proposed, shapeFor(p))))
    }
    const fixedEdges: WorldEdge[] = []
    for (const p of pieces) if (!idSet.has(p.id)) fixedEdges.push(...geoms.get(p.id)!.edges)
    const snap = findSnap(movingEdges, fixedEdges, 6)
    if (snap) {
      dx += snap.dx
      dy += snap.dy
      const isCustom = (id: string) => pieces.find((p) => p.id === id)?.custom != null
      const wouldConnect = snap.connects && !isCustom(snap.moving.pieceId) && !isCustom(snap.fixed.pieceId)
      setSnapHint(wouldConnect ? { a: snap.moving, b: snap.fixed } : null)
    } else {
      setSnapHint(null)
      const walls: [Pt, Pt][] = room.map((p, i) => [p, room[(i + 1) % room.length]])
      const ws = findWallSnap(movingEdges, walls, 5)
      if (ws) {
        dx += ws.dx
        dy += ws.dy
      }
    }
    store.setPositions(d.ids.map((id) => ({ id, x: d.orig.get(id)!.x + dx, y: d.orig.get(id)!.y + dy })))
  }

  function onPointerUp() {
    const d = dragRef.current
    dragRef.current = null
    if (d?.mode === 'piece' && d.moved && snapHint) {
      store.connect(snapHint.a.pieceId, snapHint.b.pieceId)
    }
    if (d?.mode === 'pan') {
      const dvx = Math.abs(view.tx - d.origView.tx)
      const dvy = Math.abs(view.ty - d.origView.ty)
      if (dvx < 3 && dvy < 3) store.select(null)
    }
    setSnapHint(null)
  }

  function onWheel(e: React.WheelEvent) {
    const r = svgRef.current!.getBoundingClientRect()
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015))
  }

  function onRoomEdgeDoubleClick(e: React.MouseEvent, index: number) {
    e.stopPropagation()
    store.push()
    const w = toWorld(e)
    const pts = [...room]
    pts.splice(index + 1, 0, { x: Math.round(w.x), y: Math.round(w.y) })
    store.setRoom(pts)
  }

  // ---------- render helpers ----------
  const s = view.scale
  const pathOf = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ') + ' Z'

  function renderPiece(p: Placed) {
    const g = geoms.get(p.id)!
    const pts = g.shape.pts
    const isSel = selectedUnit?.includes(p.id)
    const isSolo = solo && selectedId === p.id
    const def = defFor(p)
    const fill = p.custom
      ? p.custom.kind === 'door'
        ? T.doorFill // doors read as wall openings, not furniture
        : T.objFill
      : def?.category === 'OTTOS'
        ? T.ottoFill
        : T.sofaFill
    const c = centroid(pts)
    const bb = pieceBBox(p)
    const stroke = isSolo ? T.solo : isSel ? T.select : T.stroke
    const overlapped = overlapping.has(p.id)
    const fontC = Math.min(9, Math.max(5, bb.w / 8))
    return (
      <g
        key={p.id}
        onPointerDown={(e) => onPiecePointerDown(e, p)}
        onDoubleClick={(e) => {
          e.stopPropagation()
          if (!editRoom) store.select(p.id, true)
        }}
        style={{ cursor: editRoom ? 'default' : 'move' }}
      >
        {p.custom?.kind === 'door' && (
          // thin jambs are hard to grab — invisible padded hit area
          <rect x={bb.x - 6} y={bb.y - 6} width={bb.w + 12} height={bb.h + 12} fill="rgba(0,0,0,0.001)" />
        )}
        <path
          d={pathOf(pts)}
          fill={overlapped ? T.overlapFill : fill}
          stroke={stroke}
          strokeWidth={isSel ? 2.5 : 1.5}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
        {p.custom?.kind === 'poly' && (
          <title>{`${p.custom.sides ?? 4}-sided polygon`}</title>
        )}
        {/* back & arm bands, open-edge ticks */}
        {g.edges.map((e, i) => {
          if (p.custom?.kind === 'ellipse') return null
          const dx = e.b.x - e.a.x
          const dy = e.b.y - e.a.y
          const len = Math.hypot(dx, dy) || 1
          const inx = -dy / len
          const iny = dx / len
          if (e.kind === 'back' || e.kind === 'arm') {
            const inset = e.kind === 'back' ? 4 : 4.5
            const shrink = 2 / len
            const a = { x: e.a.x + dx * shrink + inx * inset, y: e.a.y + dy * shrink + iny * inset }
            const b = { x: e.b.x - dx * shrink + inx * inset, y: e.b.y - dy * shrink + iny * inset }
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={e.kind === 'back' ? T.bandBack : T.bandArm}
                strokeWidth={e.kind === 'back' ? 7 : 8}
              />
            )
          }
          if (e.kind === 'open' && !p.custom) {
            const a = { x: e.a.x + inx * 1.2, y: e.a.y + iny * 1.2 }
            const b = { x: e.b.x + inx * 1.2, y: e.b.y + iny * 1.2 }
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={T.openEdge}
                strokeWidth={1.5 / s}
                vectorEffect="non-scaling-stroke"
                strokeDasharray={`${6 / s} ${4 / s}`}
              />
            )
          }
          return null
        })}
        {g.shape.decor?.map((line, i) => (
          <polyline
            key={`d${i}`}
            points={line.map((q) => `${q.x},${q.y}`).join(' ')}
            fill="none"
            stroke={T.decor}
            strokeWidth={1.4 / s}
            strokeDasharray={p.custom?.kind === 'door' && i === 0 ? `${4 / s} ${3 / s}` : undefined}
          />
        ))}
        <text x={c.x} y={c.y - 1} textAnchor="middle" fontSize={fontC} fontWeight={700} fill={T.text}>
          {displayCode(p)}
          {isReversible(p) ? ' ⇄' : ''}
        </text>
        <text x={c.x} y={c.y + fontC} textAnchor="middle" fontSize={fontC * 0.72} fill={T.subText}>
          {F(bb.w)} × {F(bb.h)}
        </text>
        {p.label && !p.custom && (
          <text x={c.x} y={c.y + fontC * 2} textAnchor="middle" fontSize={fontC * 0.72} fill={T.subText} fontStyle="italic">
            {p.label}
          </text>
        )}
      </g>
    )
  }

  function dimLines(ids: string[], color: string, offset: number) {
    const ps = pieces.filter((p) => ids.includes(p.id))
    if (!ps.length) return null
    const bb = unitBBox(ps)
    const o = offset
    const fs = 12 / s
    const tick = 4 / s
    return (
      <g key={ids.join(',')} stroke={color} fill={color} strokeWidth={1 / s} pointerEvents="none">
        <line x1={bb.x} y1={bb.y - o} x2={bb.x + bb.w} y2={bb.y - o} />
        <line x1={bb.x} y1={bb.y - o - tick} x2={bb.x} y2={bb.y - o + tick} />
        <line x1={bb.x + bb.w} y1={bb.y - o - tick} x2={bb.x + bb.w} y2={bb.y - o + tick} />
        <text x={bb.x + bb.w / 2} y={bb.y - o - 3 / s} textAnchor="middle" fontSize={fs} stroke="none">
          {F(bb.w)}
        </text>
        <line x1={bb.x - o} y1={bb.y} x2={bb.x - o} y2={bb.y + bb.h} />
        <line x1={bb.x - o - tick} y1={bb.y} x2={bb.x - o + tick} y2={bb.y} />
        <line x1={bb.x - o - tick} y1={bb.y + bb.h} x2={bb.x - o + tick} y2={bb.y + bb.h} />
        <text
          x={bb.x - o - 3 / s}
          y={bb.y + bb.h / 2}
          textAnchor="middle"
          fontSize={fs}
          stroke="none"
          transform={`rotate(-90 ${bb.x - o - 3 / s} ${bb.y + bb.h / 2})`}
        >
          {F(bb.h)}
        </text>
      </g>
    )
  }

  const gridStep = 12
  const walls: [Pt, Pt][] = room.map((p, i) => [p, room[(i + 1) % room.length]])

  return (
    <div ref={wrapRef} className="canvas-wrap">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        onPointerDown={onBackgroundPointerDown}
      >
        <defs>
          <pattern
            id="grid"
            width={gridStep * s}
            height={gridStep * s}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${view.tx},${view.ty})`}
          >
            <path d={`M ${gridStep * s} 0 L 0 0 0 ${gridStep * s}`} fill="none" stroke={T.grid} strokeWidth={1} />
          </pattern>
          <clipPath id="roomclip">
            <path d={pathOf(room.map((p) => ({ x: p.x * s + view.tx, y: p.y * s + view.ty })))} />
          </clipPath>
        </defs>
        {/* endless workspace: grid everywhere, room interior lifted */}
        <rect width={size.w} height={size.h} fill={T.workspace} />
        <g clipPath="url(#roomclip)">
          <rect width={size.w} height={size.h} fill={T.roomFill} />
        </g>
        <rect width={size.w} height={size.h} fill="url(#grid)" />
        <g transform={`translate(${view.tx},${view.ty}) scale(${s})`}>
          {/* room outline */}
          <path d={pathOf(room)} fill="none" stroke={T.wall} strokeWidth={5 / s} vectorEffect="none" />
          {/* room dims */}
          <RoomDims room={room} s={s} units={store.units} t={T} />
          {/* pieces: unselected first so selected renders on top */}
          {pieces.filter((p) => !selectedUnit?.includes(p.id)).map(renderPiece)}
          {pieces.filter((p) => selectedUnit?.includes(p.id)).map(renderPiece)}
          {/* resize anchor for selected custom objects */}
          {(() => {
            const sel = pieces.find((p) => p.id === selectedId)
            if (!sel?.custom || editRoom) return null
            const bb = pieceBBox(sel)
            const hs = 11 / s
            return (
              <rect
                x={bb.x + bb.w - hs / 2}
                y={bb.y + bb.h - hs / 2}
                width={hs}
                height={hs}
                fill="#fff"
                stroke={T.select}
                strokeWidth={2 / s}
                style={{ cursor: 'nwse-resize' }}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  safeCapture(e)
                  dragRef.current = {
                    mode: 'resize',
                    id: sel.id,
                    start: toWorld(e),
                    origW: sel.custom!.w,
                    origD: sel.custom!.d,
                    rot: sel.rot,
                    reversed: sel.reversed,
                    pushed: false,
                  }
                }}
              />
            )
          })()}
          {/* unit dimension lines: all multi-piece units + selected unit */}
          {units
            .filter((u) => u.length > 1 || (selectedUnit && u[0] === selectedUnit[0]))
            .map((u) => dimLines(u, u === selectedUnit ? T.select : T.dimNeutral, 8))}
          {/* door keep-clear zones */}
          {doorZones.map((z) => {
            const zc = centroid(z.zone)
            return (
              <g key={`dz${z.id}`} pointerEvents="none">
                <path
                  d={pathOf(z.zone)}
                  fill={z.blocked ? 'rgba(192,57,43,0.15)' : T.zoneClearFill}
                  stroke={z.blocked ? '#c0392b' : T.zoneClearStroke}
                  strokeWidth={1.2 / s}
                  strokeDasharray={`${4 / s} ${3 / s}`}
                />
                {z.blocked && (
                  <text x={zc.x} y={zc.y} textAnchor="middle" fontSize={11 / s} fontWeight={700} fill="#c0392b">
                    needs {F(DOOR_CLEARANCE)} clear
                  </text>
                )}
              </g>
            )
          })}
          {/* clearance gaps */}
          {gaps.map((g, i) => {
            const c = gapColor(g.dist)
            const vertical = Math.abs(g.a.x - g.b.x) < 0.01
            return (
              <g key={`gap${i}`} stroke={c} fill={c} pointerEvents="none">
                <line
                  x1={g.a.x}
                  y1={g.a.y}
                  x2={g.b.x}
                  y2={g.b.y}
                  strokeWidth={1.5 / s}
                  strokeDasharray={`${5 / s} ${3 / s}`}
                />
                <text
                  x={(g.a.x + g.b.x) / 2 + (vertical ? 3 / s : 0)}
                  y={(g.a.y + g.b.y) / 2 - (vertical ? 0 : 3 / s)}
                  textAnchor={vertical ? 'start' : 'middle'}
                  fontSize={11 / s}
                  stroke="none"
                  fontWeight={600}
                >
                  {F(g.dist)}
                </text>
              </g>
            )
          })}
          {/* snap hint */}
          {snapHint && (
            <g stroke={T.snap} strokeWidth={4 / s} strokeLinecap="round" pointerEvents="none">
              <line x1={snapHint.a.a.x} y1={snapHint.a.a.y} x2={snapHint.a.b.x} y2={snapHint.a.b.y} />
              <line x1={snapHint.b.a.x} y1={snapHint.b.a.y} x2={snapHint.b.b.x} y2={snapHint.b.b.y} />
            </g>
          )}
          {/* room editing handles */}
          {editRoom && (
            <g>
              {walls.map(([a, b], i) => (
                <line
                  key={`e${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="rgba(43,125,233,0.001)"
                  strokeWidth={12 / s}
                  style={{ cursor: 'move' }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    safeCapture(e)
                    dragRef.current = { mode: 'edge', index: i, start: toWorld(e), origRoom: room.map((p) => ({ ...p })), pushed: false }
                  }}
                  onDoubleClick={(e) => onRoomEdgeDoubleClick(e, i)}
                />
              ))}
              {room.map((p, i) => (
                <circle
                  key={`v${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={6 / s}
                  fill={T.select}
                  stroke="#fff"
                  strokeWidth={2 / s}
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    if (e.altKey && room.length > 3) {
                      store.push()
                      store.setRoom(room.filter((_, j) => j !== i))
                      return
                    }
                    safeCapture(e)
                    dragRef.current = { mode: 'vertex', index: i, pushed: false }
                  }}
                />
              ))}
            </g>
          )}
        </g>
      </svg>
      {editRoom && (
        <div className="canvas-note">
          Room edit: drag walls or corners · double-click a wall to add a corner · ⌥-click a corner to delete it
        </div>
      )}
      <div className="zoom-ctl" title="Zoom (scroll wheel works anywhere; Space+drag pans)">
        <button onClick={() => zoomAt(size.w / 2, size.h / 2, 1 / 1.25)}>−</button>
        <span>{Math.round((view.scale / (defaultScale.current || 1)) * 100)}%</span>
        <button onClick={() => zoomAt(size.w / 2, size.h / 2, 1.25)}>+</button>
        <button
          title="Fit room"
          onClick={() => {
            userZoomed.current = false
            setView(fitView())
          }}
        >
          ⤢
        </button>
      </div>
    </div>
  )
}

function RoomDims({ room, s, units, t }: { room: Pt[]; s: number; units: 'in' | 'ftin'; t: CanvasTheme }) {
  const F = (v: number) => fmtLen(v, units)
  const bb = bboxOf(room)
  const fs = 13 / s
  const o = 26 / s + 8
  const irregular = room.length > 4
  return (
    <g stroke={t.roomDim} fill={t.roomDim} strokeWidth={1 / s} pointerEvents="none">
      <line x1={bb.x} y1={bb.y - o} x2={bb.x + bb.w} y2={bb.y - o} />
      <text x={bb.x + bb.w / 2} y={bb.y - o - 4 / s} textAnchor="middle" fontSize={fs} stroke="none" fontWeight={600}>
        {F(bb.w)} ({(bb.w / 12).toFixed(1)} ft)
      </text>
      <line x1={bb.x - o} y1={bb.y} x2={bb.x - o} y2={bb.y + bb.h} />
      <text
        x={bb.x - o - 4 / s}
        y={bb.y + bb.h / 2}
        textAnchor="middle"
        fontSize={fs}
        stroke="none"
        fontWeight={600}
        transform={`rotate(-90 ${bb.x - o - 4 / s} ${bb.y + bb.h / 2})`}
      >
        {F(bb.h)} ({(bb.h / 12).toFixed(1)} ft)
      </text>
      {irregular &&
        room.map((p, i) => {
          const q = room[(i + 1) % room.length]
          const mx = (p.x + q.x) / 2
          const my = (p.y + q.y) / 2
          const len = Math.hypot(q.x - p.x, q.y - p.y)
          const nx = ((q.y - p.y) / (len || 1)) * (10 / s)
          const ny = (-(q.x - p.x) / (len || 1)) * (10 / s)
          return (
            <text key={i} x={mx + nx} y={my + ny} textAnchor="middle" fontSize={11 / s} stroke="none">
              {F(len)}
            </text>
          )
        })}
    </g>
  )
}
