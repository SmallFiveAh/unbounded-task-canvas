/* ============================================================
   表格选区状态
   ------------------------------------------------------------
   三套状态共同描述选区（与原实现一致）：
   · anchor   锚点：Shift 扩展选区的支点
   · cursor   活动格：键盘移动与编辑作用于它
   · selection 选中集合：Set<'r:c'>，可非连续（Ctrl 单击增减）
   外加单元格编辑态（editing + draft）。所有越界坐标都夹到表格内。
   ============================================================ */

import { useEffect, useRef, useState } from 'react'
import { cellKey } from './tableGeometry'

export function useTableSelection({ rows, cols, cells, tableId, onCellChange }) {
  const inputRef = useRef(null)
  const [anchor, setAnchor] = useState(null) // 范围起始格（Shift 扩展的支点）
  const [cursor, setCursor] = useState(null) // 活动格（键盘 / 编辑作用于它）
  const [selection, setSelection] = useState(() => new Set()) // Set<'r:c'>
  const [editing, setEditing] = useState(null) // { r, c }
  const [draft, setDraft] = useState('')

  // 进入编辑：聚焦输入框并把光标移到末尾
  useEffect(() => {
    if (editing && inputRef.current) {
      const input = inputRef.current
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  }, [editing])

  const commitEditing = () => {
    if (!editing) return
    onCellChange(tableId, editing.r, editing.c, draft)
    setEditing(null)
    setDraft('')
  }

  // 放弃编辑（Esc）：不写回内容
  const cancelEditing = () => {
    setEditing(null)
    setDraft('')
  }

  // 把选区收敛到单个单元格（编辑、单击等场景）；越界时夹到表格内
  const selectOnly = (r, c) => {
    const cell = {
      r: Math.min(rows - 1, Math.max(0, r)),
      c: Math.min(cols - 1, Math.max(0, c)),
    }
    setAnchor(cell)
    setCursor(cell)
    setSelection(new Set([cellKey(cell.r, cell.c)]))
  }

  const startEdit = (r, c, initial) => {
    selectOnly(r, c)
    setEditing({ r, c })
    setDraft(initial ?? (cells[r]?.[c] ?? ''))
  }

  // 表格取消选中即清除单元格选中 / 编辑态
  const resetCellState = () => {
    setAnchor(null)
    setCursor(null)
    setSelection(new Set())
    setEditing(null)
  }

  return {
    inputRef,
    anchor,
    setAnchor,
    cursor,
    setCursor,
    selection,
    setSelection,
    editing,
    draft,
    setDraft,
    commitEditing,
    cancelEditing,
    selectOnly,
    startEdit,
    resetCellState,
  }
}
