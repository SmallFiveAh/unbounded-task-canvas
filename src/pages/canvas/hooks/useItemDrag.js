/* ============================================================
   元素拖拽 —— 节点与表格共用一套
   ------------------------------------------------------------
   · 按下：点击已选中的元素 → 整组一起移动；Ctrl/⌘ 单击 → 切换选中；
     点击未选中元素 → 仅选中它
   · 移动：把指针位移换算成世界坐标，同步应用到所有被拖拽的元素
   · 释放：清空拖拽态并交还指针捕获
   拖拽起点存在 ref 里，因此 move/up 可以直接挂在视口上收口 ——
   即使被拖的元素移出了指针下方，事件依然稳定。
   ============================================================ */

import { useRef } from 'react'

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

  const beginItemDrag = (e, itemId) => {
    let selected
    if (e.ctrlKey || e.metaKey) {
      selected = selectedIds.includes(itemId)
        ? selectedIds.filter((id) => id !== itemId)
        : [...selectedIds, itemId]
    } else if (selectedIds.includes(itemId)) {
      selected = selectedIds
    } else {
      selected = [itemId]
    }
    setSelectedIds(selected)
    setSelectedId(
      selected.includes(itemId) ? itemId : (selected[selected.length - 1] ?? null),
    )

    // 记录所有选中元素（节点 + 表格）的初始位置，一起拖拽
    const nodeById = new Map(nodes.map((n) => [n.id, n]))
    const tableById = new Map(tables.map((t) => [t.id, t]))
    dragRef.current = {
      px: e.clientX,
      py: e.clientY,
      nodeStarts: selected
        .filter((id) => nodeById.has(id))
        .map((id) => ({ id, x: nodeById.get(id).x, y: nodeById.get(id).y })),
      tableStarts: selected
        .filter((id) => tableById.has(id))
        .map((id) => ({ id, x: tableById.get(id).x, y: tableById.get(id).y })),
    }
  }

  // 移动：把指针位移换算为世界坐标，同步应用到所有选中元素
  const applyDragMove = (e) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = (e.clientX - drag.px) / view.scale
    const dy = (e.clientY - drag.py) / view.scale
    if (drag.nodeStarts.length) {
      const starts = new Map(drag.nodeStarts.map((s) => [s.id, s]))
      setNodes((ns) =>
        ns.map((n) => {
          const s = starts.get(n.id)
          return s ? { ...n, x: s.x + dx, y: s.y + dy } : n
        }),
      )
    }
    if (drag.tableStarts.length) {
      const starts = new Map(drag.tableStarts.map((s) => [s.id, s]))
      setTables((ts) =>
        ts.map((t) => {
          const s = starts.get(t.id)
          return s ? { ...t, x: s.x + dx, y: s.y + dy } : t
        }),
      )
    }
  }

  const endItemDrag = (e) => {
    dragRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  /* ---------- 节点 ---------- */

  const onNodePointerDown = (e, node) => {
    if (editingId === node.id || e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    beginItemDrag(e, node.id)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  /* ---------- 表格 ---------- */

  const onTablePointerDown = (e, table) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    beginItemDrag(e, table.id)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  return {
    dragRef,
    onNodePointerDown,
    onNodePointerMove: applyDragMove,
    onNodePointerUp: endItemDrag,
    onTablePointerDown,
    onTablePointerMove: applyDragMove,
    onTablePointerUp: endItemDrag,
    applyDragMove,
    endItemDrag,
  }
}
