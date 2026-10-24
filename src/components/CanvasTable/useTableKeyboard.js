/* ============================================================
   表格键盘操作（监听装配）
   ------------------------------------------------------------
   监听挂在 window 的「捕获阶段」：优先于画布页的窗口级监听，
   这样 Delete / 方向键 / 输入字符会先被表格接管，且不依赖元素焦点。
   按键语义（接管判定 / 剪贴板组合键 / 光标移动 / 编辑）见
   tableKeyboardActions.js —— 纯函数，可独立测试。
   ============================================================ */

import { useEffect } from 'react'
import { handleTableKeydown } from './tableKeyboardActions'

export function useTableKeyboard({
  selected,
  primary,
  editing,
  cursor,
  anchor,
  selection,
  rows,
  cols,
  cells,
  tableId,
  wrapRef,
  onClearCells,
  onCellChange,
  startEdit,
  copySelection,
  handlePasteShortcut,
  setSelection,
  setAnchor,
  setCursor,
}) {
  useEffect(() => {
    if (!selected) return

    // 每次订阅把当前状态打包：处理函数读 ctx，不直接闭包散值
    const ctx = {
      editing,
      cursor,
      anchor,
      selection,
      rows,
      cols,
      tableId,
      primary,
      wrapRef,
      onClearCells,
      startEdit,
      copySelection,
      handlePasteShortcut,
      setSelection,
      setAnchor,
      setCursor,
    }

    const onKeyDown = (e) => handleTableKeydown(e, ctx)

    // 捕获阶段优先于画布页的窗口级监听，保证按键语义正确
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, editing, cursor, anchor, selection, rows, cols, cells, tableId, onClearCells, onCellChange, primary])
}
