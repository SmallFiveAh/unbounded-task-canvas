/* ============================================================
   选中框几何（纯计算，不依赖 React）
   ------------------------------------------------------------
   把选中的节点与表格统一抽象成 {x,y,w,h,baseRadius}（世界坐标），
   屏幕空间的选中框因此能用同一套代码画出来。
   ============================================================ */

import {
  getTableSize,
  tableColWidths,
  tableHeaderH,
  tableRowHeights,
} from '../../../constants/canvasTable'
import { NODE_RADIUS } from './constants'
import { resolveContentHeight } from './noteSize'

/**
 * 由选中 id 集合构建选中矩形列表（保持 selectedIds 的顺序）
 * @param {string[]} selectedIds 选中的节点 / 表格 id
 * @param {Array} nodes 节点列表
 * @param {Array} tables 表格列表
 */
export function buildSelectionRects(selectedIds, nodes, tables) {
  if (!selectedIds.length) return []
  const rects = []
  for (const id of selectedIds) {
    const node = nodes.find((n) => n.id === id)
    if (node) {
      // 节点高度由内容撑开：把内容高度一起带进缩放状态，
      // 拖拽时才能算出生效高度
      rects.push({
        id,
        kind: 'node',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        baseRadius: NODE_RADIUS,
        contentH: resolveContentHeight(node),
      })
      continue
    }
    const table = tables.find((t) => t.id === id)
    if (table) {
      const { w, h } = getTableSize(table)
      rects.push({
        id,
        kind: 'table',
        x: table.x,
        y: table.y,
        w,
        h,
        baseRadius: 5,
        rows: table.rows,
        cols: table.cols,
        // 行列尺寸快照进缩放手势状态：整个手势期间以起点为基准重算，不增量累加
        colWidths: tableColWidths(table),
        rowHeights: tableRowHeights(table),
        headerH: tableHeaderH(table),
      })
    }
  }
  return rects
}
