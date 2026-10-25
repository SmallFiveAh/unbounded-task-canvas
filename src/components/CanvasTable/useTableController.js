/* ============================================================
   画布表格的控制器装配（从 CanvasTable 拆出的组合 hook）
   ------------------------------------------------------------
   把单元格选区（useTableSelection）、剪贴板（useTableClipboard）、
   指针交互（useTablePointer）、键盘操作（useTableKeyboard）与
   window paste 监听（useTablePaste）按原有顺序装配起来，并保留
   「取消选中 / 进入编辑时熄灭虚线框」的两个属性派生重置。
   行为与拆分前逐行一致，仅搬运，不改变任何回调时序。
   ============================================================ */

import { useRef, useState } from 'react'
import { useTableClipboard } from './useTableClipboard'
import { useTableKeyboard } from './useTableKeyboard'
import { useTablePaste } from './useTablePaste'
import { useTablePointer } from './useTablePointer'
import { useTableSelection } from './useTableSelection'

/**
 * @param {object}   table        表格数据（id / rows / cols / cells …）
 * @param {boolean}  selected     表格是否被选中
 * @param {boolean}  primary      是否为主选中元素
 * @param {number[]} colWidths    逐列宽度（设计坐标，表头拖拽 / 节点缩放可改）
 * @param {number[]} rowHeights   逐行高度
 * @param {number}   headerH      列标表头行高
 * @param {Function} onPointerDown 未命中单元格时交回父级的整表拖拽
 * @param {Function} onActivate    选中单元格后激活表格（键盘事件接管）
 * @param {Function} onCellChange  单元格内容变更
 * @param {Function} onClearCells  清空选中单元格
 * @param {Function} onPasteCells  批量写入粘贴内容
 * @returns {{ sel: object, clipboard: object, pointer: object, wrapRef: object }}
 */
export function useTableController({
  table,
  selected,
  primary,
  colWidths,
  rowHeights,
  headerH,
  onPointerDown,
  onActivate,
  onCellChange,
  onClearCells,
  onPasteCells,
}) {
  const { rows, cols, cells } = table
  const wrapRef = useRef(null)

  const sel = useTableSelection({
    rows,
    cols,
    cells,
    tableId: table.id,
    onCellChange,
  })

  const clipboard = useTableClipboard({
    table,
    cells,
    selection: sel.selection,
    cursor: sel.cursor,
    anchor: sel.anchor,
    onClearCells,
    onPasteCells,
    // 粘贴后选区 / 光标的新落点由本组件写回
    onSelectionChange: ({ anchor, selection, cursor }) => {
      sel.setAnchor(anchor)
      sel.setSelection(selection)
      sel.setCursor(cursor)
    },
    wrapRef,
  })

  const pointer = useTablePointer({
    table,
    rows,
    cols,
    colWidths,
    rowHeights,
    headerH,
    editing: sel.editing,
    commitEditing: sel.commitEditing,
    onPointerDown,
    onActivate,
    anchor: sel.anchor,
    setAnchor: sel.setAnchor,
    selection: sel.selection,
    setSelection: sel.setSelection,
    setCursor: sel.setCursor,
    startEdit: sel.startEdit,
    wrapRef,
  })

  // 键盘操作与 paste 监听共用同一批单元格状态参数
  const cellState = {
    selected,
    primary,
    editing: sel.editing,
    cursor: sel.cursor,
    anchor: sel.anchor,
    selection: sel.selection,
    rows,
    cols,
    cells,
    tableId: table.id,
    wrapRef,
  }
  useTableKeyboard({
    ...cellState,
    onClearCells,
    onCellChange,
    startEdit: sel.startEdit,
    copySelection: clipboard.copySelection,
    handlePasteShortcut: clipboard.handlePasteShortcut,
    setSelection: sel.setSelection,
    setAnchor: sel.setAnchor,
    setCursor: sel.setCursor,
  })
  useTablePaste({
    ...cellState,
    onPasteCells,
    applyPastedText: clipboard.applyPastedText,
  })

  // 属性变化时调整状态：表格取消选中即清除单元格选中/编辑态
  const [prevSelected, setPrevSelected] = useState(selected)
  if (prevSelected !== selected) {
    setPrevSelected(selected)
    if (!selected) {
      sel.resetCellState()
      clipboard.clearFlash()
    }
  }

  // 进入单元格编辑（双击 / 直接敲字符）即熄灭复制/剪切虚线框；
  // 粘贴落地时由 useTableClipboard 的 applyPaste 自行清掉
  const [prevEditing, setPrevEditing] = useState(sel.editing)
  if (prevEditing !== sel.editing) {
    setPrevEditing(sel.editing)
    if (sel.editing) clipboard.clearFlash()
  }

  return { sel, clipboard, pointer, wrapRef }
}
