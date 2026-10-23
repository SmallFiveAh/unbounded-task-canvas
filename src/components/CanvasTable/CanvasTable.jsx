import { memo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { getTableSize, tableCellH, tableCellW } from '../../constants/canvasTable'
import { cornerRadius } from '../../utils/canvasRadius'
import TableGrid from './TableGrid'
import { useTableClipboard } from './useTableClipboard'
import { useTableKeyboard } from './useTableKeyboard'
import { useTablePaste } from './useTablePaste'
import { useTablePointer } from './useTablePointer'
import { useTableSelection } from './useTableSelection'
import TableFlash from './TableFlash'
import styles from './CanvasTable.module.css'

/**
 * 画布表格 —— 参考 Excel 的表格元素（外壳 / 编排层）
 * ------------------------------------------------------------
 * - 列标 A/B/C… + 行号 1/2/3…，网格线单元格
 * - 双击 / 直接输入字符进入编辑
 * - Enter 确认并下移，Tab 确认并右移，Esc 取消编辑
 * - 按住表头 / 空白区域拖拽可移动表格（由父级 CanvasPage 处理拖拽）
 * - 键盘操作通过窗口捕获阶段监听，不依赖元素焦点
 *
 * 单元格多选（三套状态：anchor 锚点 / cursor 光标 / selection 选中集合）
 * - 单击：选中单个单元格，锚点与光标都落在该格
 * - Ctrl/⌘ + 单击：把单元格加入或移出选区
 * - Shift + 单击：选中「锚点 → 目标」之间的矩形范围（Ctrl+Shift 则叠加到现有选区）
 * - 从单元格按下并拖拽：实时框选矩形范围，越界时夹到表格边缘继续扩展
 * - Shift + 方向键扩展选区；Delete/Backspace 清空所有选中单元格
 * - Ctrl/⌘ + C 复制、Ctrl/⌘ + X 剪切、Ctrl/⌘ + V 粘贴（TSV，可与 Excel / 飞书表格互通）
 *   单选时从活动格铺开；多选时循环铺满整块框选区域，光标停在选区最后一格
 *
 * 分工（同目录）：
 * - tableGeometry.js     行列 / 选区的纯计算
 * - tableClipboard.js    TSV 解析与写剪贴板
 * - useTableSelection    选区状态 + 编辑态
 * - useTablePointer      单击多选 / 拖拽框选 / 双击判定
 * - useTableKeyboard     窗口捕获阶段的键盘操作
 * - useTablePaste        window paste 监听
 * - useTableClipboard    复制 / 剪切 / 粘贴 + 反馈动效
 * - TableGrid.jsx        网格与单元格渲染
 * - TableFlash.jsx       复制/剪切的蚂蚁线虚线框 + 粘贴轻提示
 */
function CanvasTable({
  table,
  selected,
  primary,
  onPointerDown,
  onActivate,
  onCellChange,
  onClearCells,
  onPasteCells,
  scale = 1,
}) {
  const { rows, cols, cells } = table
  // 单元格尺寸可由画布上的四角控制点拖动改变（见 CanvasPage 的 applyResize）
  const cellW = tableCellW(table)
  const cellH = tableCellH(table)
  const size = getTableSize(table)

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
    cellW,
    cellH,
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

  useTableKeyboard({
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
    onPasteCells,
    wrapRef,
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

  // 进入单元格编辑（双击 / 直接敲字符）即撤下复制/剪切虚线框：
  // 粘贴时虚线框由「已粘贴 H×W」文字提示自然替换，编辑则在这里显式清掉
  const [prevEditing, setPrevEditing] = useState(sel.editing)
  if (prevEditing !== sel.editing) {
    setPrevEditing(sel.editing)
    if (sel.editing) clipboard.clearFlash()
  }

  return (
    <div
      ref={wrapRef}
      data-table-id={table.id}
      tabIndex={-1}
      className={`${styles.table}${selected ? ` ${styles.selected}` : ''}`}
      style={{
        // transform 定位（同节点层）：拖动表格每帧走合成器，不触发 reflow
        transform: `translate3d(${table.x}px, ${table.y}px, 0)`,
        width: size.w,
        // 圆角随缩放补偿（缩小时仍看得出圆角，放大时不额外变圆）
        borderRadius: cornerRadius(5, size.w, size.h, scale),
        // 行高交给 CSS 变量：表头与单元格共用同一个值
        '--cell-h': `${cellH}px`,
      }}
      onPointerDown={pointer.handlePointerDown}
      onPointerMove={pointer.handlePointerMove}
      onPointerUp={pointer.handlePointerUp}
      onPointerCancel={pointer.handlePointerUp}
      onDoubleClick={pointer.handleDoubleClick}
    >
      <TableGrid
        rows={rows}
        cols={cols}
        cells={cells}
        cellW={cellW}
        selection={sel.selection}
        editing={sel.editing}
        cursor={sel.cursor}
        draft={sel.draft}
        inputRef={sel.inputRef}
        onDraftChange={sel.setDraft}
        onCommitEditing={sel.commitEditing}
        onCancelEditing={sel.cancelEditing}
        selectOnly={sel.selectOnly}
      />

      <TableFlash flash={clipboard.flash} cellW={cellW} cellH={cellH} />
    </div>
  )
}

CanvasTable.propTypes = {
  table: PropTypes.shape({
    id: PropTypes.string.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    rows: PropTypes.number.isRequired,
    cols: PropTypes.number.isRequired,
    cellW: PropTypes.number,
    cellH: PropTypes.number,
    cells: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
  }).isRequired,
  selected: PropTypes.bool.isRequired,
  primary: PropTypes.bool.isRequired,
  onPointerDown: PropTypes.func.isRequired,
  onPointerMove: PropTypes.func,
  onPointerUp: PropTypes.func,
  onActivate: PropTypes.func.isRequired,
  onCellChange: PropTypes.func.isRequired,
  onClearCells: PropTypes.func.isRequired,
  onPasteCells: PropTypes.func.isRequired,
  scale: PropTypes.number,
}

export default memo(CanvasTable)
