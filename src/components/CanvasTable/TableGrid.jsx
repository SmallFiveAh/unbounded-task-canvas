import { Fragment, memo } from 'react'
import PropTypes from 'prop-types'
import { TABLE_ROW_HEADER_W } from '../../constants/canvasTable'
import { cellKey, colLetter } from './tableGeometry'
import styles from './CanvasTable.module.css'

/**
 * 表格网格：列标 A/B/C… + 行号 1/2/3… + 单元格
 * ------------------------------------------------------------
 * 纯渲染：选区、光标格、编辑态都由外面算好传进来。
 * 列宽 / 行高通过 gridTemplateColumns / gridTemplateRows 显式定轨：
 * - 拖表头边缘改单列 / 单行，拖四角控制点整体等比缩放，文字都不跟缩
 * - 显式像素轨道 + 外壳宽高用同一份数据推导 → 缩放过程零错位
 *
 * 选区外轮廓：与相邻未选中单元格相邻的那一侧画 1px 强调线，
 * 非连续选区也能为每个连通块各自描边。
 * 通过 CSS 变量传给 .cell.selected::after 覆盖层（见模块 CSS 注释）：
 * 覆盖层上 / 左外扩 1px、右 / 下含住本格边框，四条线才能全部骑在网格线上
 * （outline / inset box-shadow 都做不到一半在格外、一半在格内）。
 */
const sideVars = (r, c, selection) => ({
  '--st': selection.has(cellKey(r - 1, c)) ? 0 : 1,
  '--sr': selection.has(cellKey(r, c + 1)) ? 0 : 1,
  '--sb': selection.has(cellKey(r + 1, c)) ? 0 : 1,
  '--sl': selection.has(cellKey(r, c - 1)) ? 0 : 1,
})

function TableGrid({
  rows,
  cols,
  cells,
  colWidths,
  rowHeights,
  headerH,
  selection,
  editing,
  cursor,
  draft,
  inputRef,
  onDraftChange,
  onCommitEditing,
  onCancelEditing,
  selectOnly,
}) {
  // 多选时末端那一格保留选区底色（单选时它被挖空为表格底色，见模块 CSS）
  const multiSelect = selection.size > 1

  return (
    <div
      data-grid
      className={styles.grid}
      style={{
        gridTemplateColumns: `${TABLE_ROW_HEADER_W}px ${colWidths.map((w) => `${w}px`).join(' ')}`,
        gridTemplateRows: `${headerH}px ${rowHeights.map((h) => `${h}px`).join(' ')}`,
      }}
    >
      {/* 左上角空白格 */}
      <div className={styles.head} />
      {/* 列标 A B C …（右缘是列宽拖拽热区，见 useHeaderResize） */}
      {Array.from({ length: cols }, (_, c) => (
        <div key={`col-${c}`} data-col-head={c} className={styles.head}>
          {colLetter(c)}
        </div>
      ))}
      {/* 行号 + 单元格（行号下缘是行高拖拽热区） */}
      {Array.from({ length: rows }, (_, r) => (
        <Fragment key={`row-${r}`}>
          <div data-row-head={r} className={styles.head}>
            {r + 1}
          </div>
          {Array.from({ length: cols }, (_, c) => {
            const isSelected = selection.has(cellKey(r, c))
            const isEditing = editing && editing.r === r && editing.c === c
            // 编辑中：选区描边与光标样式全部退场，边框交给输入框自己画。
            // 光标格与普通选中格共用 .selected::after 描边，无需区分处理
            const isCursor = !isEditing && cursor && cursor.r === r && cursor.c === c
            return (
              <div
                key={c}
                data-cell-r={r}
                data-cell-c={c}
                className={`${styles.cell}${
                  isSelected && !isEditing ? ` ${styles.selected}` : ''
                }${isCursor ? ` ${styles.cursor}` : ''}${
                  isCursor && multiSelect ? ` ${styles.cursorMulti}` : ''
                }`}
                style={isSelected && !isEditing ? sideVars(r, c, selection) : undefined}
              >
                {isEditing ? (
                  <input
                    ref={inputRef}
                    className={styles.cellInput}
                    value={draft}
                    onChange={(e) => onDraftChange(e.target.value)}
                    onPointerDown={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onBlur={onCommitEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        onCommitEditing()
                        selectOnly(r + 1, c)
                      } else if (e.key === 'Tab') {
                        e.preventDefault()
                        onCommitEditing()
                        selectOnly(r, c + 1)
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        onCancelEditing()
                      }
                    }}
                  />
                ) : (
                  <span className={styles.cellText}>{cells[r]?.[c]}</span>
                )}
              </div>
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}

TableGrid.propTypes = {
  rows: PropTypes.number.isRequired,
  cols: PropTypes.number.isRequired,
  cells: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
  colWidths: PropTypes.arrayOf(PropTypes.number).isRequired,
  rowHeights: PropTypes.arrayOf(PropTypes.number).isRequired,
  headerH: PropTypes.number.isRequired,
  selection: PropTypes.object.isRequired,
  editing: PropTypes.shape({ r: PropTypes.number.isRequired, c: PropTypes.number.isRequired }),
  cursor: PropTypes.shape({ r: PropTypes.number.isRequired, c: PropTypes.number.isRequired }),
  draft: PropTypes.string,
  inputRef: PropTypes.object,
  onDraftChange: PropTypes.func.isRequired,
  onCommitEditing: PropTypes.func.isRequired,
  onCancelEditing: PropTypes.func.isRequired,
  selectOnly: PropTypes.func.isRequired,
}

export default memo(TableGrid)
