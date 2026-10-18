/* ============================================================
   选中框几何 + 四角控制点缩放
   ------------------------------------------------------------
   · selectionRects：把选中的节点与表格统一抽象成 {x,y,w,h,baseRadius}
     （世界坐标），屏幕空间的选中框因此能用同一套代码画出来
   · 拖动控制点：按「对边固定」重算矩形，拖过最小尺寸时不会翻面
   · 节点改 w/h；表格改单元格尺寸（字不会被拉扁，语义上是拉宽列、拉高行）
   控制点本身只负责发起缩放：move/up 统一由视口收口（见 useViewportPointer），
   这样即使控制点被拖走，事件也不会丢。
   ============================================================ */

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  TABLE_MAX_CELL_H,
  TABLE_MAX_CELL_W,
  TABLE_MIN_CELL_H,
  TABLE_MIN_CELL_W,
  TABLE_ROW_HEADER_W,
  getTableSize,
} from '../../constants/canvasTable'
import { NODE_MIN_H, NODE_MIN_W, NODE_RADIUS } from './constants'
import { clamp } from './geometry'

export function useSelectionResize({
  selectedIds,
  selectedId,
  nodes,
  tables,
  setNodes,
  setTables,
  view,
  viewportRef,
}) {
  const resizeRef = useRef(null) // 四角控制点缩放状态
  // 缩放中的实时尺寸徽标（仅拖动控制点时出现）
  const [resizeLabel, setResizeLabel] = useState(null)

  const selectionRects = useMemo(() => {
    if (!selectedIds.length) return []
    const rects = []
    for (const id of selectedIds) {
      const node = nodes.find((n) => n.id === id)
      if (node) {
        rects.push({
          id,
          kind: 'node',
          x: node.x,
          y: node.y,
          w: node.w,
          h: node.h,
          baseRadius: NODE_RADIUS,
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
        })
      }
    }
    return rects
  }, [selectedIds, nodes, tables])

  // 按下控制点：记录起始矩形与指针位置，指针捕获交给视口统一收口
  // （这样即使控制点自身被移走，move/up 依然稳定落到视口上）
  const beginResize = useCallback(
    (e, corner) => {
      const rect = selectionRects.find((r) => r.id === selectedId)
      const viewport = viewportRef.current
      if (!rect || !viewport) return
      resizeRef.current = { ...rect, corner, px: e.clientX, py: e.clientY }
      viewport.setPointerCapture(e.pointerId)
    },
    [selectionRects, selectedId, viewportRef],
  )

  // 拖动控制点：把屏幕位移换算回世界坐标，再按「对边固定」重算矩形
  const applyResize = (e) => {
    const rz = resizeRef.current
    if (!rz) return

    const dx = (e.clientX - rz.px) / view.scale
    const dy = (e.clientY - rz.py) / view.scale
    const fromWest = rz.corner.includes('w')
    const fromNorth = rz.corner.includes('n')

    // 表格总高 = 表头行 + rows 行，表头行高与单元格共用 cellH（见 canvasTable.js）
    const minW =
      rz.kind === 'table' ? TABLE_ROW_HEADER_W + rz.cols * TABLE_MIN_CELL_W : NODE_MIN_W
    const minH =
      rz.kind === 'table' ? (rz.rows + 1) * TABLE_MIN_CELL_H : NODE_MIN_H

    // 先算宽高并夹到下限，再由固定边反推左上角 —— 拖过最小尺寸时不会「翻面」
    const w = Math.max(minW, fromWest ? rz.w - dx : rz.w + dx)
    const h = Math.max(minH, fromNorth ? rz.h - dy : rz.h + dy)
    const x = fromWest ? rz.x + rz.w - w : rz.x
    const y = fromNorth ? rz.y + rz.h - h : rz.y

    setResizeLabel({ w: Math.round(w), h: Math.round(h) })

    if (rz.kind === 'node') {
      setNodes((ns) => ns.map((n) => (n.id === rz.id ? { ...n, x, y, w, h } : n)))
      return
    }

    // 表格：外框尺寸换算成统一的单元格宽 / 高。
    // 只改行列尺寸、不缩放内容 —— 字不会被拉扁，语义上等于「拉宽列、拉高行」。
    const cellW = Math.round(
      clamp((w - TABLE_ROW_HEADER_W) / rz.cols, TABLE_MIN_CELL_W, TABLE_MAX_CELL_W),
    )
    const cellH = Math.round(
      clamp(h / (rz.rows + 1), TABLE_MIN_CELL_H, TABLE_MAX_CELL_H),
    )
    const fittedW = TABLE_ROW_HEADER_W + rz.cols * cellW
    const fittedH = (rz.rows + 1) * cellH
    setTables((ts) =>
      ts.map((t) =>
        t.id === rz.id
          ? {
              ...t,
              cellW,
              cellH,
              x: fromWest ? rz.x + rz.w - fittedW : rz.x,
              y: fromNorth ? rz.y + rz.h - fittedH : rz.y,
            }
          : t,
      ),
    )
  }

  const endResize = (e) => {
    resizeRef.current = null
    setResizeLabel(null)
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return { selectionRects, resizeLabel, beginResize, applyResize, endResize, resizeRef }
}
