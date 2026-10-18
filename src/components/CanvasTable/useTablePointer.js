/* ============================================================
   表格指针交互 —— 单击多选 + 拖拽框选 + 双击进入编辑
   ------------------------------------------------------------
   单元格多选的三套语义（与 Excel 一致）：
   · 单击：选中单个单元格，锚点与光标都落在该格
   · Ctrl/⌘ + 单击：把单元格加入或移出选区
   · Shift + 单击：选中「锚点 → 目标」之间的矩形范围（Ctrl+Shift 叠加）
   · 从单元格按下并拖拽：实时框选，越界时夹到表格边缘继续扩展
   双击是「指针按下瞬间」用时间 + 同格自行判定的：画布内的 pointerdown
   既做了 preventDefault 又对容器做了捕获，原生 dblclick 会被吞掉或
   重定向到容器，目标不再是单元格。
   未命中单元格（表头 / 空白）时，把事件交回父级做整表拖拽。
   ============================================================ */

import { useRef } from 'react'
import { TABLE_ROW_HEADER_W } from '../../constants/canvasTable'
import { cellKey, rectKeys } from './tableGeometry'

/** 同一个单元格两次按下视为「双击」的时间窗（毫秒） */
const DOUBLE_PRESS_MS = 400

export function useTablePointer({
  table,
  rows,
  cols,
  cellW,
  cellH,
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
  const dragRef = useRef(null) // 单元格框选状态
  const dblPressRef = useRef({ key: null, time: 0 }) // 自实现的双击判定基准

  /**
   * 屏幕坐标 → 单元格坐标。
   * 通过 grid 的实测尺寸与设计尺寸之比换算缩放，因此不依赖外部 scale。
   * 表头行高与单元格共用 cellH，总高 = (rows + 1) * cellH（见 canvasTable.js）。
   * clamp=true 时越界夹到最近边缘（拖拽框选保持扩展到末行/末列）。
   */
  const cellFromPoint = (clientX, clientY, clamp) => {
    const grid = wrapRef.current?.querySelector('[data-grid]')
    if (!grid) return null
    const rect = grid.getBoundingClientRect()
    const kx = rect.width / (TABLE_ROW_HEADER_W + cols * cellW)
    const ky = rect.height / ((rows + 1) * cellH)
    if (!kx || !ky) return null
    const c = Math.floor(((clientX - rect.left) / kx - TABLE_ROW_HEADER_W) / cellW)
    const r = Math.floor(((clientY - rect.top) / ky - cellH) / cellH)
    const inside = r >= 0 && r < rows && c >= 0 && c < cols
    if (!inside && !clamp) return null
    return {
      r: Math.min(rows - 1, Math.max(0, r)),
      c: Math.min(cols - 1, Math.max(0, c)),
    }
  }

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

    // 双击进入编辑（自实现判定）：画布内 pointerdown 既做了 preventDefault，
    // 又对容器做了 setPointerCapture，原生 dblclick 会被吞掉或重定向到容器，
    // 导致事件目标不再是单元格。这里在「指针按下瞬间」用时间 + 同格判断，
    // 不依赖任何后端鼠标事件，因此稳定可靠。
    const now = performance.now()
    const lastPress = dblPressRef.current
    if (lastPress.key === cellKey(cell.r, cell.c) && now - lastPress.time <= DOUBLE_PRESS_MS) {
      dblPressRef.current = { key: null, time: 0 } // 重置，避免连续按下重复触发
      onActivate?.(table.id)
      startEdit(cell.r, cell.c)
      return
    }
    dblPressRef.current = { key: cellKey(cell.r, cell.c), time: now }

    const additive = e.ctrlKey || e.metaKey
    let base

    if (e.shiftKey) {
      // Shift：锚点 → 目标的矩形；Ctrl+Shift 叠加到现有选区
      const from = anchor ?? cell
      base = additive ? new Set(selection) : new Set()
      rectKeys(from.r, from.c, cell.r, cell.c).forEach((k) => base.add(k))
      setAnchor(from)
    } else if (additive) {
      // Ctrl/⌘：加入或移出选区
      base = new Set(selection)
      const key = cellKey(cell.r, cell.c)
      if (base.has(key)) base.delete(key)
      else base.add(key)
      setAnchor(cell)
    } else {
      base = new Set([cellKey(cell.r, cell.c)])
      setAnchor(cell)
    }

    setCursor(cell)
    setSelection(base)

    // 选中单元格即激活表格，让画布把它作为当前元素（键盘事件才会被接管）
    onActivate?.(table.id)

    // 记录拖拽基准：drag 过程中在 base 之上叠加「起点 → 当前格」的矩形
    dragRef.current = {
      base: new Set(base),
      start: cell,
      last: cell,
      moved: false,
    }
    wrapRef.current?.setPointerCapture(e.pointerId)
    wrapRef.current?.focus({ preventScroll: true })
  }

  const handlePointerMove = (e) => {
    const drag = dragRef.current
    if (!drag) return

    const cell = cellFromPoint(e.clientX, e.clientY, true)
    if (!cell) return
    if (cell.r === drag.last.r && cell.c === drag.last.c) return

    drag.last = cell
    // 尚未离开起始格时不改变选区（保证单击语义干净）
    if (!drag.moved) {
      if (cell.r === drag.start.r && cell.c === drag.start.c) return
      drag.moved = true
      // 真的在拖拽框选：作废双击基准，避免拖完后紧接着的一次按下被误判为双击
      dblPressRef.current = { key: null, time: 0 }
    }

    e.stopPropagation()
    const next = new Set(drag.base)
    rectKeys(drag.start.r, drag.start.c, cell.r, cell.c).forEach((k) => next.add(k))
    setSelection(next)
    setCursor(cell)
  }

  const handlePointerUp = (e) => {
    const drag = dragRef.current
    if (!drag) return // 表格整体拖拽由父级的视口事件收尾
    dragRef.current = null
    e.stopPropagation()
    if (wrapRef.current?.hasPointerCapture(e.pointerId)) {
      wrapRef.current.releasePointerCapture(e.pointerId)
    }
  }

  const handleDoubleClick = (e) => {
    e.stopPropagation() // 避免触发画布「双击空白添加节点」
    if (editing) return // pointerdown 已完成判定并进入编辑
    const cellEl = e.target.closest?.('[data-cell-r]')
    // 指针捕获后原生 dblclick 的 target 可能是容器本身，此时用坐标反查单元格兜底
    const cell = cellEl
      ? { r: Number(cellEl.dataset.cellR), c: Number(cellEl.dataset.cellC) }
      : cellFromPoint(e.clientX, e.clientY, false)
    if (cell) startEdit(cell.r, cell.c)
  }

  return { handlePointerDown, handlePointerMove, handlePointerUp, handleDoubleClick }
}
