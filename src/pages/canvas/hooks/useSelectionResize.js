/* ============================================================
   选中框几何 + 四角控制点缩放（状态与编排）
   ------------------------------------------------------------
   · selectionRects：矩形构建纯计算见 lib/selectionRects.js
   · 拖动控制点：位移换算与矩形重算纯计算见 lib/resizeGeometry.js
   · 手势期间的固定边兜底见 useResizeEdgePin.js
   控制点本身只负责发起缩放：move/up 统一由视口收口（见 useViewportPointer），
   这样即使控制点被拖走，事件也不会丢。
   ============================================================ */

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildSelectionRects } from '../lib/selectionRects'
import { resolveResizeGeometry, tableCellSizeFromBox } from '../lib/resizeGeometry'
import { useResizeEdgePin } from './useResizeEdgePin'

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

  // 节点与表格统一抽象成 {x,y,w,h,baseRadius}（世界坐标），选中框用同一套代码绘制
  const selectionRects = useMemo(
    () => buildSelectionRects(selectedIds, nodes, tables),
    [selectedIds, nodes, tables],
  )

  // 按下控制点：记录起始矩形与指针位置，指针捕获交给视口统一收口
  // （这样即使控制点自身被移走，move/up 依然稳定落到视口上）。
  // pinRight / pinBottom 是这次手势里「绝不允许移动」的对边位置 ——
  // 后续每一帧都以它为准反推左上角，而不是以当前 y + h 反推，
  // 这样即使内容高度在中途变化，固定边也不会被推着走
  const beginResize = (e, corner) => {
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
  }

  // 拖动控制点：把屏幕位移换算回世界坐标，再按「对边固定」重算矩形
  const applyResize = (e) => {
    const rz = resizeRef.current
    if (!rz) return

    const dx = (e.clientX - rz.px) / view.scale
    const dy = (e.clientY - rz.py) / view.scale
    // 内容高度读「实时值」而非手势起点冻结值：拖窄会让文字重排变高，否则 → 漂移
    const live = nodesRef.current.find((n) => n.id === rz.id)
    const g = resolveResizeGeometry(rz, dx, dy, live)

    setResizeLabel({ w: Math.round(g.w), h: Math.round(g.h) })

    if (rz.kind === 'node') {
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id !== rz.id) return n
          // 节点：写下限不写 h 的「用户意图」，h 只落生效高度，
          // 这样选中框与盒子永远同一个数，且内容变短后还能再缩回去
          return { ...n, x: g.x, y: g.y, w: g.w, h: g.h, minH: g.targetH }
        }),
      )
      return
    }

    // 表格：外框尺寸换算成统一的单元格宽 / 高，并按拟合尺寸反推左上角
    const { cellW, cellH, fittedW, fittedH } = tableCellSizeFromBox(g.w, g.h, rz.rows, rz.cols)
    setTables((ts) =>
      ts.map((t) =>
        t.id === rz.id
          ? {
              ...t,
              cellW,
              cellH,
              x: rz.fromWest ? rz.x + rz.w - fittedW : rz.x,
              y: rz.fromNorth ? rz.y + rz.h - fittedH : rz.y,
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

  // 固定边兜底：ResizeObserver 任何一帧回写 h 时，把对边钉回原位（见 useResizeEdgePin）
  useResizeEdgePin({ resizeRef, nodes, setNodes, setResizeLabel })

  return { selectionRects, resizeLabel, beginResize, applyResize, endResize, resizeRef }
}
