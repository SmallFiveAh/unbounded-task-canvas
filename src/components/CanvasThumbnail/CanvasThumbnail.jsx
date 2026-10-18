import { useId, useMemo } from 'react'
import {
  TABLE_CELL_H,
  TABLE_CELL_W,
  TABLE_COL_HEADER_H,
  TABLE_ROW_HEADER_W,
  getTableSize,
} from '../../constants/canvasTable'
import { useCanvasSnapshot } from '../../hooks/useCanvasSnapshot'
import styles from './CanvasThumbnail.module.css'

/**
 * 任务卡片缩略图：渲染该任务无限画布的「结构预览」
 * - 数据来自 localStorage 存档（与画布页同一份），改动实时同步
 * - 节点 / 连线 / 表格的几何形态按世界坐标绘制
 * - 点阵网格画在屏幕空间（CSS 背景），不随内容坐标平移或缩放，密度恒定
 * - 出于数据保密：不渲染任何文本内容，节点文字用以横条代替
 */

const PADDING = 56
const NODE_RADIUS = 8

/** 内容包围盒 → 正方形 viewBox（与缩略图区域比例一致，完整显示且不裁切） */
function computeLayout(nodes, tables) {
  const rects = [
    ...nodes.map((n) => ({ x: n.x, y: n.y, w: n.w, h: n.h })),
    ...tables.map((t) => {
      const { w, h } = getTableSize(t.rows, t.cols)
      return { x: t.x, y: t.y, w, h }
    }),
  ]

  const minX = Math.min(...rects.map((r) => r.x)) - PADDING
  const minY = Math.min(...rects.map((r) => r.y)) - PADDING
  const maxX = Math.max(...rects.map((r) => r.x + r.w)) + PADDING
  const maxY = Math.max(...rects.map((r) => r.y + r.h)) + PADDING
  const side = Math.max(maxX - minX, maxY - minY, 260)

  return {
    vx: (minX + maxX) / 2 - side / 2,
    vy: (minY + maxY) / 2 - side / 2,
    side,
  }
}

/** 节点：只画轮廓与「文字占位条」，不渲染任何真实文本 */
function NodeShape({ node }) {
  const accent = node.kind === 'accent'
  const barH = Math.min(Math.max(node.h * 0.1, 3.5), 9)
  const lineCount = node.h >= node.w * 0.42 ? 2 : 1
  const gap = barH * 1.1
  const totalH = lineCount * barH + (lineCount - 1) * gap
  const startY = node.y + node.h / 2 - totalH / 2
  const widths = lineCount === 2 ? [0.56, 0.34] : [0.5]

  return (
    <g>
      <rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        rx={NODE_RADIUS}
        className={accent ? styles.nodeAccent : styles.node}
      />
      {widths.map((ratio, i) => (
        <rect
          key={i}
          x={node.x + 12}
          y={startY + i * (barH + gap)}
          width={node.w * ratio}
          height={barH}
          rx={barH / 2}
          className={accent ? styles.barAccent : styles.bar}
        />
      ))}
    </g>
  )
}

/** 表格：只画外框、行列头与网格线，单元格内容一律不渲染 */
function TableShape({ table }) {
  const { w, h } = getTableSize(table.rows, table.cols)
  const headBottom = table.y + TABLE_COL_HEADER_H

  const colLines = Array.from(
    { length: table.cols + 1 },
    (_, c) => table.x + TABLE_ROW_HEADER_W + c * TABLE_CELL_W,
  )
  const rowLines = Array.from(
    { length: table.rows + 1 },
    (_, r) => headBottom + r * TABLE_CELL_H,
  )

  return (
    <g>
      <rect x={table.x} y={table.y} width={w} height={h} rx={4} className={styles.table} />
      {/* 行头 / 列头底纹 */}
      <rect
        x={table.x}
        y={table.y}
        width={TABLE_ROW_HEADER_W}
        height={h}
        className={styles.tableHead}
      />
      <rect
        x={table.x}
        y={table.y}
        width={w}
        height={TABLE_COL_HEADER_H}
        className={styles.tableHead}
      />
      {colLines.map((x, i) => (
        <line
          key={`c-${i}`}
          x1={x}
          y1={table.y}
          x2={x}
          y2={table.y + h}
          className={styles.tableLine}
        />
      ))}
      {rowLines.map((y, i) => (
        <line
          key={`r-${i}`}
          x1={table.x}
          y1={y}
          x2={table.x + w}
          y2={y}
          className={styles.tableLine}
        />
      ))}
    </g>
  )
}

export default function CanvasThumbnail({ task }) {
  const { nodes, edges, tables } = useCanvasSnapshot(task)
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  const layout = useMemo(
    () => (nodes.length || tables.length ? computeLayout(nodes, tables) : null),
    [nodes, tables],
  )

  const edgeLines = useMemo(() => {
    if (!layout) return []
    const nodeById = new Map(nodes.map((n) => [n.id, n]))
    return edges
      .map((edge) => {
        const from = nodeById.get(edge.from)
        const to = nodeById.get(edge.to)
        if (!from || !to) return null
        return {
          id: edge.id,
          x1: from.x + from.w / 2,
          y1: from.y + from.h / 2,
          x2: to.x + to.w / 2,
          y2: to.y + to.h / 2,
        }
      })
      .filter(Boolean)
  }, [edges, nodes, layout])

  if (!layout) {
    // 空画布：不铺点阵网格，只留空状态
    return (
      <div className={styles.wrap}>
        <div className={styles.empty}>
          <i className="bi bi-inbox" aria-hidden="true"></i>
          <span className={styles.emptyText}>画布还是空的</span>
        </div>
      </div>
    )
  }

  const { vx, vy, side } = layout
  const arrowId = `thumb-arrow-${uid}`

  return (
    <div className={`${styles.wrap} ${styles.grid}`}>
      <svg
        className={styles.svg}
        viewBox={`${vx} ${vy} ${side} ${side}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${task.title} 的画布结构预览`}
      >
        <defs>
          <marker
            id={arrowId}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0,0 L6,3 L0,6 Z" className={styles.arrow} />
          </marker>
        </defs>

        {/* 连线层：与画布一致的虚线 + 箭头 */}
        {edgeLines.map((line) => (
          <line
            key={line.id}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            className={styles.edge}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            markerEnd={`url(#${arrowId})`}
          />
        ))}

        {/* 表格层 */}
        {tables.map((table) => (
          <TableShape key={table.id} table={table} />
        ))}

        {/* 节点层 */}
        {nodes.map((node) => (
          <NodeShape key={node.id} node={node} />
        ))}
      </svg>
    </div>
  )
}
