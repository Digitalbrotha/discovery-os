'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import type { HypothesisOST, OSTSolution } from './ost-view'

// ── Layout ──────────────────────────────────────────────────────

type NodeKind = 'opportunity' | 'solution' | 'test'

interface MapNode {
  id: string
  kind: NodeKind
  label: string
  x: number
  y: number
}

type Edge = [string, string]

const H_SPACING = 220
const OPP_Y     = 80
const SOL_Y     = 300
const TEST_Y    = 500

function avg(arr: number[]) {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length
}

function computeLayout(hypotheses: HypothesisOST[]): { nodes: MapNode[]; edges: Edge[] } {
  const nodes: MapNode[] = []
  const edges: Edge[]    = []
  let cursor = 0

  for (const h of hypotheses) {
    const solutions = (h.hypothesis_solutions ?? [])
      .map((hs) => hs.solutions)
      .filter(Boolean) as OSTSolution[]

    const solXs: number[] = []

    if (solutions.length === 0) {
      solXs.push(cursor)
      cursor += H_SPACING
    } else {
      for (const sol of solutions) {
        const tests   = sol.testing_activities ?? []
        const testXs: number[] = []

        if (tests.length === 0) {
          testXs.push(cursor)
          cursor += H_SPACING
        } else {
          for (const test of tests) {
            testXs.push(cursor)
            nodes.push({ id: test.id, kind: 'test',
              label: (test.description ?? 'Unnamed').slice(0, 28),
              x: cursor, y: TEST_Y })
            edges.push([sol.id, test.id])
            cursor += H_SPACING
          }
        }

        const solX = avg(testXs)
        solXs.push(solX)
        nodes.push({ id: sol.id, kind: 'solution',
          label: sol.title.slice(0, 28),
          x: solX, y: SOL_Y })
        edges.push([h.id, sol.id])
      }
    }

    nodes.push({ id: h.id, kind: 'opportunity',
      label: h.title.slice(0, 32),
      x: avg(solXs), y: OPP_Y })
  }

  // Centre
  if (nodes.length > 0) {
    const xs = nodes.map((n) => n.x)
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2
    nodes.forEach((n) => { n.x -= cx })
  }

  return { nodes, edges }
}

// ── Canvas drawing ──────────────────────────────────────────────

const TILE = 48

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, ox: number, oy: number) {
  // Fill base
  ctx.fillStyle = '#101c28'
  ctx.fillRect(0, 0, w, h)

  // Major tile grid
  const sx = ((ox % TILE) + TILE) % TILE
  const sy = ((oy % TILE) + TILE) % TILE

  ctx.strokeStyle = '#172333'
  ctx.lineWidth = 1

  for (let x = sx - TILE; x < w + TILE; x += TILE) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
  }
  for (let y = sy - TILE; y < h + TILE; y += TILE) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }

  // Subtle cross dots at intersections
  ctx.fillStyle = '#1e3048'
  for (let x = sx - TILE; x < w + TILE; x += TILE) {
    for (let y = sy - TILE; y < h + TILE; y += TILE) {
      ctx.fillRect(x - 1, y - 1, 2, 2)
    }
  }
}

function drawPath(ctx: CanvasRenderingContext2D, from: MapNode, to: MapNode) {
  const x1 = from.x, y1 = from.y
  const x2 = to.x,   y2 = to.y
  const midY = (y1 + y2) / 2

  ctx.save()

  // Shadow/glow
  ctx.strokeStyle = 'rgba(90,140,90,0.18)'
  ctx.lineWidth = 7
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.bezierCurveTo(x1, midY, x2, midY, x2, y2)
  ctx.stroke()

  // Road base
  ctx.strokeStyle = '#2c4a1e'
  ctx.lineWidth = 5
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.bezierCurveTo(x1, midY, x2, midY, x2, y2)
  ctx.stroke()

  // Dashed path surface
  ctx.strokeStyle = '#4a7a30'
  ctx.lineWidth = 2.5
  ctx.setLineDash([10, 8])
  ctx.lineDashOffset = 0
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.bezierCurveTo(x1, midY, x2, midY, x2, y2)
  ctx.stroke()

  ctx.setLineDash([])
  ctx.restore()
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (candidate.length > maxChars && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, 2)
}

function drawOpportunityNode(ctx: CanvasRenderingContext2D, node: MapNode) {
  const { x, y } = node
  const r = 38

  ctx.save()

  // Outer glow
  ctx.shadowColor = '#c8960a'
  ctx.shadowBlur  = 22

  // Outer ring
  ctx.beginPath()
  ctx.arc(x, y, r + 6, 0, Math.PI * 2)
  ctx.fillStyle = '#2a1e00'
  ctx.fill()
  ctx.strokeStyle = '#5a3e00'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.shadowBlur = 14

  // 8-pointed star
  ctx.beginPath()
  const pts = 8
  for (let i = 0; i < pts * 2; i++) {
    const angle = (i * Math.PI) / pts - Math.PI / 2
    const rad   = i % 2 === 0 ? r : r * 0.48
    const px    = x + Math.cos(angle) * rad
    const py    = y + Math.sin(angle) * rad
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = '#c8960a'
  ctx.fill()
  ctx.strokeStyle = '#7a5500'
  ctx.lineWidth = 2.5
  ctx.stroke()

  ctx.shadowBlur = 0

  // Center gem
  ctx.beginPath()
  ctx.arc(x, y, r * 0.32, 0, Math.PI * 2)
  const gem = ctx.createRadialGradient(x - 4, y - 4, 1, x, y, r * 0.32)
  gem.addColorStop(0, '#fffbe0')
  gem.addColorStop(0.5, '#f5c842')
  gem.addColorStop(1, '#c8960a')
  ctx.fillStyle = gem
  ctx.fill()

  // Tiny sparkle lines
  ctx.strokeStyle = 'rgba(255,250,210,0.7)'
  ctx.lineWidth = 1
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(a) * (r * 0.38), y + Math.sin(a) * (r * 0.38))
    ctx.lineTo(x + Math.cos(a) * (r * 0.52), y + Math.sin(a) * (r * 0.52))
    ctx.stroke()
  }

  ctx.restore()

  // Label
  const lines = wrapText(node.label, 18)
  drawLabel(ctx, x, y + r + 10, lines, '#f5c842', 13, 600)
}

function drawSolutionNode(ctx: CanvasRenderingContext2D, node: MapNode) {
  const { x, y } = node
  const r = 26

  ctx.save()
  ctx.shadowColor = '#4a90d9'
  ctx.shadowBlur  = 18

  // Outer ring
  ctx.beginPath()
  ctx.arc(x, y, r + 5, 0, Math.PI * 2)
  ctx.fillStyle = '#001830'
  ctx.fill()
  ctx.strokeStyle = '#1a3a5c'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Diamond
  ctx.beginPath()
  ctx.moveTo(x,       y - r)
  ctx.lineTo(x + r,   y)
  ctx.lineTo(x,       y + r * 1.25)
  ctx.lineTo(x - r,   y)
  ctx.closePath()

  const dg = ctx.createLinearGradient(x - r, y - r, x + r, y + r * 1.25)
  dg.addColorStop(0, '#7bc5f8')
  dg.addColorStop(0.5, '#4a90d9')
  dg.addColorStop(1, '#1a4a80')
  ctx.fillStyle = dg
  ctx.fill()
  ctx.strokeStyle = '#1a4a80'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.shadowBlur = 0

  // Highlight facet
  ctx.beginPath()
  ctx.moveTo(x - r * 0.45, y - r * 0.5)
  ctx.lineTo(x, y - r)
  ctx.lineTo(x + r, y)
  ctx.lineTo(x + r * 0.1, y - r * 0.1)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.fill()

  ctx.restore()

  const lines = wrapText(node.label, 20)
  drawLabel(ctx, x, y + r * 1.35 + 8, lines, '#7bc5f8', 11, 500)
}

function drawTestNode(ctx: CanvasRenderingContext2D, node: MapNode) {
  const { x, y } = node
  const r = 18

  ctx.save()
  ctx.shadowColor = '#22d3ee'
  ctx.shadowBlur  = 14

  // Hexagon outer ring (slightly larger)
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 6
    const px = x + Math.cos(a) * (r + 5)
    const py = y + Math.sin(a) * (r + 5)
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = '#001820'
  ctx.fill()
  ctx.strokeStyle = '#0e4a5a'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Hexagon main body
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 6
    const px = x + Math.cos(a) * r
    const py = y + Math.sin(a) * r
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.closePath()
  const hg = ctx.createLinearGradient(x, y - r, x, y + r)
  hg.addColorStop(0, '#67e8f9')
  hg.addColorStop(0.5, '#22d3ee')
  hg.addColorStop(1, '#0891b2')
  ctx.fillStyle = hg
  ctx.fill()
  ctx.strokeStyle = '#0e7490'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.shadowBlur = 0

  // Flask icon: small circle base + stem + brim
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 1.8
  ctx.lineCap = 'round'
  const s = r * 0.3
  // Stem (top)
  ctx.beginPath()
  ctx.moveTo(x - s * 0.6, y - s * 1.5)
  ctx.lineTo(x + s * 0.6, y - s * 1.5)
  ctx.stroke()
  // Flask body (triangle-ish)
  ctx.beginPath()
  ctx.moveTo(x - s * 0.4, y - s * 1.5)
  ctx.lineTo(x - s * 1.1, y + s * 1.0)
  ctx.arcTo(x, y + s * 1.7, x + s * 1.1, y + s * 1.0, s * 0.7)
  ctx.lineTo(x + s * 0.4, y - s * 1.5)
  ctx.stroke()
  // Bubbles inside
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.beginPath(); ctx.arc(x - s * 0.3, y + s * 0.4, s * 0.22, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + s * 0.3, y + s * 0.8, s * 0.15, 0, Math.PI * 2); ctx.fill()

  ctx.restore()

  const lines = wrapText(node.label, 22)
  drawLabel(ctx, x, y + r + 8, lines, '#67e8f9', 10, 500)
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  lines: string[],
  color: string,
  size: number,
  weight: number,
) {
  const lineH = size + 5
  ctx.save()
  ctx.font = `${weight} ${size}px ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  const totalH = lines.length * lineH
  const maxW   = Math.max(...lines.map((l) => ctx.measureText(l).width))

  // Background pill
  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  roundRect(ctx, cx - maxW / 2 - 5, baseY - 3, maxW + 10, totalH + 6, 4)
  ctx.fill()

  // Text
  ctx.fillStyle = color
  lines.forEach((line, i) => {
    ctx.fillText(line, cx, baseY + i * lineH)
  })

  ctx.restore()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function drawDecorativeBorder(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Outer frame
  ctx.strokeStyle = '#2a4a30'
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3)

  // Inner frame
  ctx.strokeStyle = '#1a3020'
  ctx.lineWidth = 1
  ctx.strokeRect(8, 8, w - 16, h - 16)

  // Corner ornaments
  const cs = 14 // corner size
  const corners = [
    [10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10],
  ] as [number, number][]

  ctx.strokeStyle = '#3a6040'
  ctx.lineWidth = 1.5

  corners.forEach(([cx, cy]) => {
    const dx = cx < w / 2 ? 1 : -1
    const dy = cy < h / 2 ? 1 : -1
    ctx.beginPath()
    ctx.moveTo(cx + dx * cs, cy)
    ctx.lineTo(cx, cy)
    ctx.lineTo(cx, cy + dy * cs)
    ctx.stroke()

    // Small diamond
    ctx.beginPath()
    ctx.moveTo(cx + dx * 4, cy)
    ctx.lineTo(cx, cy - dy * 4)
    ctx.lineTo(cx - dx * 4, cy)
    ctx.lineTo(cx, cy + dy * 4)
    ctx.closePath()
    ctx.strokeStyle = '#4a7040'
    ctx.stroke()
    ctx.strokeStyle = '#3a6040'
  })
}

// ── Main component ──────────────────────────────────────────────

export function GraphView({ hypotheses }: { hypotheses: HypothesisOST[] }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })

  const { nodes, edges } = useMemo(() => computeLayout(hypotheses), [hypotheses])
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale]   = useState(0.6)
  const dragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  // Resize observer
  useEffect(() => {
    const container = containerRef.current
    const canvas    = canvasRef.current
    if (!container || !canvas) return

    const update = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      canvas.width  = w
      canvas.height = h
      setCanvasSize({ w, h })
    }
    const ro = new ResizeObserver(update)
    ro.observe(container)
    update()
    return () => ro.disconnect()
  }, [])

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || canvasSize.w === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { w, h } = canvasSize
    ctx.clearRect(0, 0, w, h)

    drawBackground(ctx, w, h, offset.x + w / 2, offset.y + h / 2)

    ctx.save()
    ctx.translate(offset.x + w / 2, offset.y + h / 2)
    ctx.scale(scale, scale)

    // Edges first (beneath nodes)
    edges.forEach(([pid, cid]) => {
      const from = nodeMap.get(pid)
      const to   = nodeMap.get(cid)
      if (from && to) drawPath(ctx, from, to)
    })

    // Nodes
    nodes.forEach((node) => {
      if (node.kind === 'opportunity') drawOpportunityNode(ctx, node)
      else if (node.kind === 'solution') drawSolutionNode(ctx, node)
      else drawTestNode(ctx, node)
    })

    ctx.restore()

    drawDecorativeBorder(ctx, w, h)
  }, [nodes, edges, nodeMap, offset, scale, canvasSize])

  // Mouse handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
  }, [])

  const onMouseUp = useCallback(() => { dragging.current = false }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.11
    setScale((prev) => Math.max(0.25, Math.min(3, prev * factor)))
  }, [])

  // Touch handlers
  const lastTouch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }, [])
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && lastTouch.current) {
      const dx = e.touches[0].clientX - lastTouch.current.x
      const dy = e.touches[0].clientY - lastTouch.current.y
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
    }
  }, [])
  const onTouchEnd = useCallback(() => { lastTouch.current = null }, [])

  if (hypotheses.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl text-[13px] text-text-3 border border-border-soft"
        style={{ height: 600 }}
      >
        No opportunities yet.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden select-none"
      style={{ height: 600, background: '#101c28', cursor: dragging.current ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-5 left-5 flex flex-col gap-2.5 pointer-events-none">
        {([
          ['#f5c842', '✦', 'Opportunity'],
          ['#7bc5f8', '◆', 'Solution'],
          ['#22d3ee', '⬡', 'Assumption test'],
        ] as const).map(([color, icon, label]) => (
          <div key={label} className="flex items-center gap-2">
            <span style={{ color }} className="text-sm leading-none">{icon}</span>
            <span
              className="text-[10px] font-semibold tracking-[0.1em] uppercase"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Controls hint */}
      <div className="absolute top-3 right-4 flex flex-col gap-0.5 pointer-events-none text-right">
        {['Drag · pan', 'Scroll · zoom'].map((t) => (
          <span key={t} className="text-[9px] tracking-[0.12em] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {t}
          </span>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-5 right-5 flex flex-col gap-1 pointer-events-auto">
        <button
          onClick={() => setScale((s) => Math.min(3, s * 1.25))}
          className="w-7 h-7 flex items-center justify-center rounded text-[16px] font-light leading-none"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          +
        </button>
        <button
          onClick={() => setScale((s) => Math.max(0.25, s * 0.8))}
          className="w-7 h-7 flex items-center justify-center rounded text-[16px] font-light leading-none"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          −
        </button>
        <button
          onClick={() => { setOffset({ x: 0, y: 0 }); setScale(1) }}
          className="w-7 h-7 flex items-center justify-center rounded text-[9px] font-semibold tracking-widest"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          ⌂
        </button>
      </div>
    </div>
  )
}
