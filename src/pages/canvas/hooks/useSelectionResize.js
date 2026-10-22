/* ============================================================
   选中框几何 + 四角控制点缩放
   ------------------------------------------------------------
   · selectionRects：把选中的节点与表格统一抽象成 {x,y,w,h,baseRadius}
     （世界坐标），屏幕空间的选中框因此能用同一套代码画出来
   · 拖动控制点：按「对边固定」重算矩形，拖过最小尺寸时不会翻面
   · 节点改 w/h；表格改单元格尺寸（字不会被拉扁，语义上是拉宽列、拉高行）
   控制点本身只负责发起缩放：move/up 统一由视口收口（见 useViewportPointer），
   这样即使控制点被拖走，事件也不会丢。

   便签的高度是「内容撑开」的，因此不能直接写 h：
   · 拖控制点写的是 minH（用户下限），h 由 max(minH, contentH) 推出
   · 反推左上角时用的必须是这个「生效高度」而不是指针位移量，
     否则内容比下限高时，盒子会一边缩一边把固定边推着走 —— 就是漂移
   ============================================================ */

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  TABLE_MAX_CELL_H,
  TABLE_MAX_CELL_W,
  TABLE_MIN_CELL_H,
  TABLE_MIN_CELL_W,
  TABLE_ROW_HEADER_W,
  getTableSize,
} from '../../../constants/canvasTable'
import { isNoteKind } from '../../../constants/noteStyles'
import { NODE_MIN_H, NODE_MIN_W, NODE_RADIUS } from '../lib/constants'
import { clamp, pinOppositeEdge } from '../lib/geometry'
import { noteHeight, resolveContentHeight } from '../lib/noteSize'

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

  // 最新节点表：指针事件里要读「实时内容高度」，不能读渲染期闭包里的旧值
  const nodesRef = useRef(nodes)
  useLayoutEffect(() => {
    nodesRef.current = nodes
  })

  const selectionRects = useMemo(() => {
    if (!selectedIds.length) return []
    const rects = []
    for (const id of selectedIds) {
      const node = nodes.find((n) => n.id === id)
      if (node) {
        // 便签的高度由内容撑开：把内容高度一起带进缩放状态，
        // 拖拽时才能算出生效高度（普通节点没有这个字段）
        const isNote = isNoteKind(node.kind)
        rects.push({
          id,
          kind: 'node',
          x: node.x,
          y: node.y,
          w: node.w,
          h: node.h,
          baseRadius: NODE_RADIUS,
          isNote,
          contentH: isNote ? resolveContentHeight(node) : undefined,
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
  // （这样即使控制点自身被移走，move/up 依然稳定落到视口上）。
  // pinRight / pinBottom 是这次手势里「绝不允许移动」的对边位置 ——
  // 后续每一帧都以它为准反推左上角，而不是以当前 y + h 反推，
  // 这样即使内容高度在中途变化，固定边也不会被推着走
  const beginResize = useCallback(
    (e, corner) => {
      const rect = selectionRects.find((r) => r.id === selectedId)
      const viewport = viewportRef.current
      if (!rect || !viewport) return
      resizeRef.current = {
        ...rect,
        corner,
        px: e.clientX,
        py: e.clientY,
        fromWest: corner.includes('w'),
        fromNorth: corner.includes('n'),
        pinRight: rect.x + rect.w,
        pinBottom: rect.y + rect.h,
      }
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
    const { fromWest, fromNorth } = rz

    // 表格总高 = 表头行 + rows 行，表头行高与单元格共用 cellH（见 canvasTable.js）
    const minW =
      rz.kind === 'table' ? TABLE_ROW_HEADER_W + rz.cols * TABLE_MIN_CELL_W : NODE_MIN_W
    const minH =
      rz.kind === 'table' ? (rz.rows + 1) * TABLE_MIN_CELL_H : NODE_MIN_H

    // 先算宽高并夹到下限，再由固定边反推左上角 —— 拖过最小尺寸时不会「翻面」
    const w = Math.max(minW, fromWest ? rz.w - dx : rz.w + dx)
    // 指针意图 = 用户这次想设定的高度下限
    const targetH = Math.max(minH, fromNorth ? rz.h - dy : rz.h + dy)
    // 便签的生效高度：内容比下限高时停在内容高度（文字不能溢出盒子）。
    // 内容高度必须读「实时值」而不是手势起点冻结的值：
    // 拖窄会让文字重排变高，冻结值会和真实内容对不上，盒子只能往下长 → 漂移
    const live = nodesRef.current.find((n) => n.id === rz.id)
    const contentFloor = rz.isNote ? resolveContentHeight(live || rz) : 0
    const h = rz.isNote ? noteHeight(targetH, contentFloor) : targetH
    const { x, y } = pinOppositeEdge(rz, w, h, fromWest, fromNorth)

    setResizeLabel({ w: Math.round(w), h: Math.round(h) })

    if (rz.kind === 'node') {
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id !== rz.id) return n
          // 便签：写下限不写 h 的「用户意图」，h 只落生效高度，
          // 这样选中框与盒子永远同一个数，且内容变短后还能再缩回去
          return rz.isNote
            ? { ...n, x, y, w, h, minH: targetH }
            : { ...n, x, y, w, h }
        }),
      )
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

  // 固定边兜底 —— 手势期间「对边零位移」是硬约束，而不是只在指针移动那一帧成立。
  // 便签的高度由内容决定，ResizeObserver 可能在任何一帧回写新的 h
  // （拖窄 → 文字重排变高、字体度量抖动…），此时若左上角还停在上一帧的位置，
  // 固定边就会被推着走 —— 这就是「缩放时选中框漂移」的真正来源。
  // 收敛性：写入后 y + h 恒等于 pinBottom，下一轮比较相等即不再写入，不会自激。
  // 容差 1px：offsetHeight 与内容测量之间有取整差，不能为这点差异每帧抖一次。
  useLayoutEffect(() => {
    const rz = resizeRef.current
    if (!rz || !rz.isNote) return
    const node = nodes.find((n) => n.id === rz.id)
    if (!node) return
    const x = rz.fromWest ? rz.pinRight - node.w : node.x
    const y = rz.fromNorth ? rz.pinBottom - node.h : node.y
    if (Math.abs(x - node.x) < 1 && Math.abs(y - node.y) < 1) return
    setNodes((ns) => ns.map((n) => (n.id === rz.id ? { ...n, x, y } : n)))
    setResizeLabel({ w: Math.round(node.w), h: Math.round(node.h) })
  }, [nodes, setNodes])

  return { selectionRects, resizeLabel, beginResize, applyResize, endResize, resizeRef }
}
