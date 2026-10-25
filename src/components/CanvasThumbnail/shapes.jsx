/* ============================================================
   缩略图形状 —— 纯展示 SVG 片段
   ------------------------------------------------------------
   节点：只画轮廓与「文字占位条」，不渲染任何真实文本（数据保密）
   表格：只画外框、行列头与网格线，单元格内容一律不渲染
   ============================================================ */

import PropTypes from 'prop-types'
import {
  TABLE_ROW_HEADER_W,
  getTableSize,
  sizeOffsets,
  tableColWidths,
  tableHeaderH,
  tableRowHeights,
} from '../../constants/canvasTable'
import styles from './CanvasThumbnail.module.css'

const NODE_RADIUS = 8
const TABLE_RADIUS = 4

/** 文字占位条的几何参数（按节点尺寸自适应 1~2 条） */
function nodeBarLayout(node) {
  const barH = Math.min(Math.max(node.h * 0.1, 3.5), 9)
  const lineCount = node.h >= node.w * 0.42 ? 2 : 1
  const gap = barH * 1.1
  const totalH = lineCount * barH + (lineCount - 1) * gap
  const startY = node.y + node.h / 2 - totalH / 2
  const widths = lineCount === 2 ? [0.56, 0.34] : [0.5]
  return { barH, gap, startY, widths }
}

/** 节点：圆角矩形 + 文字占位条 */
export function NodeShape({ node }) {
  const accent = node.kind === 'accent'
  const { barH, gap, startY, widths } = nodeBarLayout(node)

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

NodeShape.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.string.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    w: PropTypes.number.isRequired,
    h: PropTypes.number.isRequired,
    kind: PropTypes.string,
  }).isRequired,
}

/** 表格：外框 + 行头/列头底纹 + 网格线（列宽 / 行高与画布同源，逐列逐行绘制） */
export function TableShape({ table }) {
  const { w, h } = getTableSize(table)
  const colOffsets = sizeOffsets(tableColWidths(table))
  const rowOffsets = sizeOffsets(tableRowHeights(table))
  const headerH = tableHeaderH(table)
  const headBottom = table.y + headerH

  const colLines = Array.from(
    { length: table.cols + 1 },
    (_, c) => table.x + TABLE_ROW_HEADER_W + colOffsets[c],
  )
  const rowLines = Array.from(
    { length: table.rows + 1 },
    (_, r) => headBottom + rowOffsets[r],
  )

  return (
    <g>
      <rect
        x={table.x}
        y={table.y}
        width={w}
        height={h}
        rx={TABLE_RADIUS}
        className={styles.table}
      />
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
        height={headerH}
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

TableShape.propTypes = {
  table: PropTypes.shape({
    id: PropTypes.string.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    rows: PropTypes.number.isRequired,
    cols: PropTypes.number.isRequired,
  }).isRequired,
}
