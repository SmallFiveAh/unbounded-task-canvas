/* ============================================================
   表格键盘操作
   ------------------------------------------------------------
   监听挂在 window 的「捕获阶段」：优先于画布页的窗口级监听，
   这样 Delete / 方向键 / 输入字符会先被表格接管，且不依赖元素焦点。
   · 方向键 / Tab 移动光标，Shift 扩展选区
   · Enter 进入编辑，Delete/Backspace 清空选区
   · Ctrl/⌘ + C / X 复制剪切，+ V 交给 paste 通道（见 useTableClipboard）
   · Esc 取消单元格选中（再按一次由画布取消表格选中）
   · 直接输入字符：以该字符开始编辑（Excel 行为）
   ============================================================ */

import { useEffect } from 'react'
import { cellKey, keyToCoord, rectKeys } from './tableGeometry'

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

    const onKeyDown = (e) => {
      if (editing) return // 编辑中由输入框自行处理
      if (!cursor) return // 无活动单元格：交给画布处理（Esc 取消选中 / Delete 删除表格）

      const target = e.target
      // 焦点在表格内时接管；焦点落在 body（点过画布后常见）时只有「主选中表格」接管，
      // 否则多选几张表时同一次按键会被每张表各处理一遍
      const inTable = wrapRef.current?.contains(target)
      if (!inTable && (target !== document.body || !primary)) return
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const { r, c } = cursor
      const extend = e.shiftKey
      const additive = e.ctrlKey || e.metaKey

      // Ctrl/⌘ + C / X / V：剪贴板。放在 switch 之前、且先于「输入字符即编辑」的分支，
      // 否则带修饰键的字母会被当成输入字符吞掉（这正是之前复制不生效的原因）。
      if (additive && !e.altKey) {
        const combo = e.key.toLowerCase()
        if (combo === 'c' || combo === 'x') {
          e.preventDefault()
          e.stopPropagation()
          copySelection(combo === 'x')
          return
        }
        if (combo === 'v') {
          // 不阻断默认行为：浏览器随后会在 window 上派发 paste 事件，
          // 那是唯一能同步拿到 clipboardData 的可靠通道（见 useTablePaste）。
          // 少数环境下 paste 事件不派发，这里用异步 API 兜底 —— 序号一变即说明已处理过
          handlePasteShortcut()
          return
        }
      }

      // 移动光标；Shift 时锚点固定、只移动另一端，形成矩形选区
      const moveTo = (nr, nc) => {
        const to = {
          r: Math.min(rows - 1, Math.max(0, nr)),
          c: Math.min(cols - 1, Math.max(0, nc)),
        }
        if (extend) {
          const from = anchor ?? cursor
          const next = additive ? new Set(selection) : new Set()
          rectKeys(from.r, from.c, to.r, to.c).forEach((k) => next.add(k))
          setSelection(next)
          setAnchor(from)
        } else {
          setSelection(new Set([cellKey(to.r, to.c)]))
          setAnchor(to)
        }
        setCursor(to)
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          return moveTo(r - 1, c)
        case 'ArrowDown':
          e.preventDefault()
          return moveTo(r + 1, c)
        case 'ArrowLeft':
          e.preventDefault()
          return moveTo(r, c - 1)
        case 'ArrowRight':
        case 'Tab':
          e.preventDefault()
          return moveTo(r, c + 1)
        case 'Enter':
          e.preventDefault()
          return startEdit(r, c)
        case 'Delete':
        case 'Backspace': {
          // 清空整个选区（不删除表格）；空选区（全部 Ctrl 取消）不动作
          e.preventDefault()
          e.stopPropagation()
          if (!selection.size) return
          return onClearCells?.(tableId, [...selection].map(keyToCoord))
        }
        case 'Escape':
          // 取消单元格选中；再次 Esc 由画布取消表格选中
          e.stopPropagation()
          setSelection(new Set())
          setAnchor(null)
          return setCursor(null)
        default:
          // 直接输入字符：以该字符开始编辑（Excel 行为）
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault()
            startEdit(r, c, e.key)
          }
      }
    }

    // 捕获阶段优先于画布页的窗口级监听，保证按键语义正确
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, editing, cursor, anchor, selection, rows, cols, cells, tableId, onClearCells, onCellChange, primary])
}
