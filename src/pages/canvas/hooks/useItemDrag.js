/* ============================================================
   元素拖拽 —— 节点与表格共用一套
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

   回调身份稳定（性能关键）：所有回调经 useCallback 固定身份，
   内部通过 latestRef 读最新状态。drag.onTablePointerDown 等若每帧
   换新函数，memo(CanvasTable) 的浅比较会失效 —— 拖节点时所有表格
   被连坐重渲染，DevTools 打开时这项放大成本足以造成肉眼卡顿。
   ============================================================ */

import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'

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

  // 每次提交同步最新依赖：回调身份稳定，同时始终读到最新状态。
  // 用 useLayoutEffect（而非 render 期间直接写 ref）：它在同一提交里
  // 同步执行，任何后续指针事件到来前必然已完成 —— 没有读到旧值的窗口
  const latestRef = useRef({})
  useLayoutEffect(() => {
    latestRef.current = {
      nodes,
      tables,
      setNodes,
      setTables,
      setSelectedId,
      selectedIds,
      setSelectedIds,
      editingId,
      view,
    }
  })

  // 把最近一次指针位置应用到所有被拖元素（rAF 回调与松手收口共用）
  const commitMove = (drag) => {
    const dx = (drag.latestX - drag.px) / drag.scale
    const dy = (drag.latestY - drag.py) / drag.scale
    if (drag.nodeStarts.size) {
      drag.setNodes((ns) =>
        ns.map((n) => {
          const s = drag.nodeStarts.get(n.id)
          return s ? { ...n, x: s.x + dx, y: s.y + dy } : n
        }),
      )
    }
    if (drag.tableStarts.size) {
      drag.setTables((ts) =>
        ts.map((t) => {
          const s = drag.tableStarts.get(t.id)
          return s ? { ...t, x: s.x + dx, y: s.y + dy } : t
        }),
      )
    }
  }

  const beginItemDrag = useCallback((e, itemId) => {
    const { selectedIds: curSelected, setSelectedIds: setMany, setSelectedId: setOne } =
      latestRef.current
    let selected
    if (e.ctrlKey || e.metaKey) {
      selected = curSelected.includes(itemId)
        ? curSelected.filter((id) => id !== itemId)
        : [...curSelected, itemId]
    } else if (curSelected.includes(itemId)) {
      selected = curSelected
    } else {
      selected = [itemId]
    }
    setMany(selected)
    setOne(selected.includes(itemId) ? itemId : (selected[selected.length - 1] ?? null))

    // 记录所有选中元素（节点 + 表格）的初始位置，一起拖拽。
    // 索引在拖拽开始时建好：move 高频期间只查 Map，零分配
    const { nodes: curNodes, tables: curTables, view: curView } = latestRef.current
    const nodeById = new Map(curNodes.map((n) => [n.id, n]))
    const tableById = new Map(curTables.map((t) => [t.id, t]))
    dragRef.current = {
      px: e.clientX,
      py: e.clientY,
      // 拖拽期间视口不动（平移/缩放与元素拖拽互斥），缩放比在起点定格
      scale: curView.scale,
      nodeStarts: new Map(
        selected
          .filter((id) => nodeById.has(id))
          .map((id) => [id, nodeById.get(id)]),
      ),
      tableStarts: new Map(
        selected
          .filter((id) => tableById.has(id))
          .map((id) => [id, tableById.get(id)]),
      ),
      latestX: e.clientX,
      latestY: e.clientY,
      raf: 0,
      setNodes: latestRef.current.setNodes,
      setTables: latestRef.current.setTables,
    }
  }, [])

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
      commitMove(d)
    })
  }, [])

  const endItemDrag = useCallback((e) => {
    const drag = dragRef.current
    if (drag) {
      if (drag.raf) cancelAnimationFrame(drag.raf)
      // rAF 可能还没轮到：松手时立即把最终位置落定，避免最后一段位移丢失
      commitMove(drag)
      dragRef.current = null
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [])

  /* ---------- 节点 ---------- */

  const onNodePointerDown = useCallback((e, node) => {
    if (latestRef.current.editingId === node.id || e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    beginItemDrag(e, node.id)
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [beginItemDrag])

  /* ---------- 表格 ---------- */

  const onTablePointerDown = useCallback((e, table) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    beginItemDrag(e, table.id)
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [beginItemDrag])

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
