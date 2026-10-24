/* ============================================================
   元素拖拽 —— 节点与表格共用一套（状态与编排）
   ------------------------------------------------------------
   · 按下：点击已选中的元素 → 整组一起移动；Ctrl/⌘ 单击 → 切换选中；
     点击未选中元素 → 仅选中它
   · 移动：把指针位移换算成世界坐标，同步应用到所有被拖拽的元素。
     指针事件与显示帧对齐（rAF）：一帧内到达的多次 move 合并为一次
     状态更新 —— 高轮询率鼠标（125–1000Hz）不再把一帧顶成多次渲染
   · 释放：立即应用最终位置（rAF 可能还没轮到，别丢最后一段位移），
     再清空拖拽态并交还指针捕获
   拖拽起点存在 ref 里，因此 move/up 可以直接挂在视口上收口 ——
   即使被拖的元素移出了指针下方，事件依然稳定。
   纯计算见 lib/itemDragCommit.js，最新 props 快照见 useLatestPropsRef.js。

   回调身份稳定（性能关键）：所有回调经 useCallback 固定身份，
   内部通过 latestRef 读最新状态。drag.onTablePointerDown 等若每帧
   换新函数，memo(CanvasTable) 的浅比较会失效 —— 拖节点时所有表格
   被连坐重渲染，DevTools 打开时这项放大成本足以造成肉眼卡顿。
   ============================================================ */

import { useCallback, useMemo, useRef } from 'react'
import {
  commitDragMove,
  createDragState,
  resolvePressSelection,
} from '../lib/itemDragCommit'
import { useLatestPropsRef } from './useLatestPropsRef'

export function useItemDrag({
  nodes,
  tables,
  setNodes,
  setTables,
  setSelectedId,
  selectedIds,
  setSelectedIds,
  editingId,
  view,
}) {
  const dragRef = useRef(null)
  const latestRef = useLatestPropsRef({
    nodes,
    tables,
    setNodes,
    setTables,
    setSelectedId,
    selectedIds,
    setSelectedIds,
    editingId,
    view,
  })

  // 按下元素：先按点击语义算出新选区，再登记整组拖拽起点
  // （选中语义与状态构造的纯计算见 lib/itemDragCommit.js）
  const beginItemDrag = useCallback((e, itemId) => {
    const latest = latestRef.current
    const { selected, primaryId } = resolvePressSelection(
      itemId,
      latest.selectedIds,
      e.ctrlKey || e.metaKey,
    )
    latest.setSelectedIds(selected)
    latest.setSelectedId(primaryId)
    dragRef.current = createDragState(e, selected, latest)
    // latestRef 是稳定 ref 引用：列入依赖只为满足 exhaustive-deps，不改变回调身份
  }, [latestRef])

  // 移动：只记下最新指针位置并预约一次 rAF，一帧至多触发一次状态更新
  const applyDragMove = useCallback((e) => {
    const drag = dragRef.current
    if (!drag) return
    drag.latestX = e.clientX
    drag.latestY = e.clientY
    if (drag.raf) return
    drag.raf = requestAnimationFrame(() => {
      const d = dragRef.current
      if (!d) return
      d.raf = 0
      commitDragMove(d)
    })
  }, [])

  const endItemDrag = useCallback((e) => {
    const drag = dragRef.current
    if (drag) {
      if (drag.raf) cancelAnimationFrame(drag.raf)
      // rAF 可能还没轮到：松手时立即把最终位置落定，避免最后一段位移丢失
      commitDragMove(drag)
      dragRef.current = null
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [])

  // 节点 / 表格按下的公共收尾：拦截冒泡与默认行为 → 发起拖拽 → 捕获指针
  const startItemPointerDown = useCallback(
    (e, itemId) => {
      e.stopPropagation()
      e.preventDefault()
      beginItemDrag(e, itemId)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [beginItemDrag],
  )

  /* ---------- 节点 ---------- */

  const onNodePointerDown = useCallback(
    (e, node) => {
      if (latestRef.current.editingId === node.id || e.button !== 0) return
      startItemPointerDown(e, node.id)
    },
    [startItemPointerDown, latestRef],
  )

  /* ---------- 表格 ---------- */

  const onTablePointerDown = useCallback(
    (e, table) => {
      if (e.button !== 0) return
      startItemPointerDown(e, table.id)
    },
    [startItemPointerDown],
  )

  // drag 对象整体身份稳定：下游 memo 组件的 props 浅比较才有效
  return useMemo(
    () => ({
      dragRef,
      onNodePointerDown,
      onTablePointerDown,
      applyDragMove,
      endItemDrag,
    }),
    [onNodePointerDown, onTablePointerDown, applyDragMove, endItemDrag],
  )
}
