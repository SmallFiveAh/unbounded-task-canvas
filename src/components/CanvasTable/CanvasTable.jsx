import { memo, useMemo } from 'react'
import PropTypes from 'prop-types'
import {
  getTableSize,
  sizeOffsets,
  tableColWidths,
  tableHeaderH,
  tableRowHeights,
} from '../../constants/canvasTable'
import { cornerRadius } from '../../utils/canvasRadius'
import TableGrid from './TableGrid'
import TableFlash from './TableFlash'
import { useTableController } from './useTableController'
import { useHeaderResize } from './useHeaderResize'
import styles from './CanvasTable.module.css'

/**
 * 画布表格 —— 参考 Excel 的表格元素（外壳 / 编排层）
 * ------------------------------------------------------------
 * - 列标 A/B/C… + 行号 1/2/3…，网格线单元格
 * - 双击 / 直接输入字符进入编辑
 * - Enter 确认并下移，Tab 确认并右移，Esc 取消编辑
 * - 按住表头 / 空白区域拖拽可移动表格（由父级 CanvasPage 处理拖拽）
 * - 拖列标右缘改列宽、拖行号下缘改行高（useHeaderResize）
 * - 拖四角控制点整体缩放表格节点（逐列宽 / 逐行高等比缩放，父级 applyResize）
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
 * - useTableController   选区 / 剪贴板 / 指针 / 键盘 / 粘贴的装配与状态重置
 * - useTableSelection    选区状态 + 编辑态
 * - useTablePointer      单击多选 / 拖拽框选 / 双击判定
 * - useHeaderResize      表头拖拽调整行高 / 列宽
 * - useTableKeyboard     窗口捕获阶段的键盘操作
 * - useTablePaste        window paste 监听
 * - useTableClipboard    复制 / 剪切 / 粘贴
 * - TableGrid.jsx        网格与单元格渲染
 * - TableFlash.jsx       复制/剪切的蚂蚁线虚线框
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
  onResizeCol,
  onResizeRow,
  scale = 1,
}) {
  // 行列尺寸可由表头拖拽（单列/单行）或四角控制点（整体等比）改变
  const colWidths = useMemo(() => tableColWidths(table), [table])
  const rowHeights = useMemo(() => tableRowHeights(table), [table])
  const headerH = tableHeaderH(table)
  const colOffsets = useMemo(() => sizeOffsets(colWidths), [colWidths])
  const rowOffsets = useMemo(() => sizeOffsets(rowHeights), [rowHeights])
  const size = getTableSize(table)

  // 选区 / 剪贴板 / 指针 / 键盘 / 粘贴的装配与状态重置（细节见 useTableController）
  const { sel, clipboard, pointer, wrapRef } = useTableController({
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
  })

  // 表头拖拽调整行高 / 列宽：优先于单元格选区 / 整表拖拽（见 useHeaderResize）。
  // 数据层契约是 (tableId, index, size)，这里用 useMemo 补上自身 id，
  // 引用稳定 → memo 的 CanvasTable 不会因父级重渲染而失效
  const handleResizeCol = useMemo(
    () => (index, width) => onResizeCol(table.id, index, width),
    [onResizeCol, table.id],
  )
  const handleResizeRow = useMemo(
    () => (index, height) => onResizeRow(table.id, index, height),
    [onResizeRow, table.id],
  )
  const headerResize = useHeaderResize({
    wrapRef,
    scale,
    colWidths,
    rowHeights,
    onResizeCol: handleResizeCol,
    onResizeRow: handleResizeRow,
    onActivate: () => onActivate(table.id),
  })

  const handlePointerDown = (e) => {
    if (headerResize.begin(e)) return
    pointer.handlePointerDown(e)
  }

  // move / up 两条手势串联：拖行列尺寸时框选管线空闲（dragRef 为空直接返回），
  // 反之亦然；空闲态的悬停光标维护只在表头热区生效
  const handlePointerMove = (e) => {
    headerResize.handleMove(e)
    pointer.handlePointerMove(e)
  }

  const handlePointerUp = (e) => {
    headerResize.end(e)
    pointer.handlePointerUp(e)
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
        // 外壳宽高与网格轨道 / 选中框同源于 getTableSize —— 缩放过程零错位
        width: size.w,
        height: size.h,
        // 圆角随缩放补偿（缩小时仍看得出圆角，放大时不额外变圆）
        borderRadius: cornerRadius(5, size.w, size.h, scale),
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={headerResize.clearHover}
      onDoubleClick={pointer.handleDoubleClick}
    >
      <TableGrid
        rows={table.rows}
        cols={table.cols}
        cells={table.cells}
        colWidths={colWidths}
        rowHeights={rowHeights}
        headerH={headerH}
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

      <TableFlash
        flash={clipboard.flash}
        colOffsets={colOffsets}
        rowOffsets={rowOffsets}
        headerH={headerH}
      />
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
    colWidths: PropTypes.arrayOf(PropTypes.number),
    rowHeights: PropTypes.arrayOf(PropTypes.number),
    headerH: PropTypes.number,
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
  onResizeCol: PropTypes.func.isRequired,
  onResizeRow: PropTypes.func.isRequired,
  scale: PropTypes.number,
}

export default memo(CanvasTable)
