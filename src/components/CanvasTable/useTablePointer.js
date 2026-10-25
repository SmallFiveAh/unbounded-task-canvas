/* ============================================================
   表格指针交互 —— 单击多选 + 拖拽框选 + 双击进入编辑（状态与编排）
   ------------------------------------------------------------
   单元格多选的三套语义（与 Excel 一致，纯计算见 tableGeometry.js
   的 resolvePressSelection / cellFromPoint）：
   · 单击：选中单个单元格，锚点与光标都落在该格
   · Ctrl/⌘ + 单击：把单元格加入或移出选区
   · Shift + 单击：选中「锚点 → 目标」之间的矩形范围（Ctrl+Shift 叠加）
   · 从单元格按下并拖拽：实时框选，越界时夹到表格边缘继续扩展
   双击判定见 useCellHitTest.js（画布内原生 dblclick 不可靠，需自行判定）；
   拖拽框选见 useCellMarquee.js。
   未命中单元格（表头 / 空白）时，把事件交回父级做整表拖拽。
   ============================================================ */

import { resolvePressSelection as resolvePressSelectionPure } from './tableGeometry'
import { useCellHitTest } from './useCellHitTest'
import { useCellMarquee } from './useCellMarquee'

export function useTablePointer({
  table,
  rows,
  cols,
  colWidths,
  rowHeights,
  headerH,
  editing,
  commitEditing,
  onPointerDown,
  onActivate,
  anchor,
  setAnchor,
  selection,
  setSelection,
  setCursor,
  startEdit,
  wrapRef,
}) {
  // 命中测试：屏幕坐标 → 单元格 + 自实现双击判定
  const hitTest = useCellHitTest({ wrapRef, rows, cols, colWidths, rowHeights, headerH })
  // 拖拽框选：起点登记 / 实时扩展 / 松手收口
  const marquee = useCellMarquee({
    wrapRef,
    cellFromPoint: hitTest.cellFromPoint,
    setSelection,
    setCursor,
    onMarqueeStart: hitTest.resetDoublePress,
  })

  const handlePointerDown = (e) => {
    if (e.button !== 0) return
    if (editing) commitEditing()

    const cellEl = e.target.closest?.('[data-cell-r]')

    // 未命中单元格（表头/空白）：走原有表格拖拽逻辑
    if (!cellEl) {
      wrapRef.current?.focus({ preventScroll: true })
      onPointerDown(e, table)
      return
    }

    e.stopPropagation()
    e.preventDefault()

    const cell = {
      r: Number(cellEl.dataset.cellR),
      c: Number(cellEl.dataset.cellC),
    }

    if (hitTest.detectDoubleClick(cell)) {
      onActivate?.(table.id)
      startEdit(cell.r, cell.c)
      return
    }

    const { selection: next, anchor: nextAnchor } = resolvePressSelectionPure({
      additive: e.ctrlKey || e.metaKey,
      shift: e.shiftKey,
      anchor,
      selection,
      cell,
    })
    setAnchor(nextAnchor)
    setCursor(cell)
    setSelection(next)

    // 选中单元格即激活表格，让画布把它作为当前元素（键盘事件才会被接管）
    onActivate?.(table.id)

    // 登记拖拽基准并捕获指针：drag 过程中在 next 之上叠加「起点 → 当前格」的矩形
    marquee.begin(cell, next, e)
  }

  const handlePointerMove = marquee.handleMove
  const handlePointerUp = marquee.end

  const handleDoubleClick = (e) => {
    e.stopPropagation() // 避免触发画布「双击空白添加节点」
    if (editing) return // pointerdown 已完成判定并进入编辑
    const cellEl = e.target.closest?.('[data-cell-r]')
    // 指针捕获后原生 dblclick 的 target 可能是容器本身，此时用坐标反查单元格兜底
    const cell = cellEl
      ? { r: Number(cellEl.dataset.cellR), c: Number(cellEl.dataset.cellC) }
      : hitTest.cellFromPoint(e.clientX, e.clientY, false)
    if (cell) startEdit(cell.r, cell.c)
  }

  return { handlePointerDown, handlePointerMove, handlePointerUp, handleDoubleClick }
}
