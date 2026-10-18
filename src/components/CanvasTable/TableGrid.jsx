import { Fragment } from 'react'
import { TABLE_ROW_HEADER_W } from '../../constants/canvasTable'
import { cellKey, colLetter } from './tableGeometry'
import styles from './CanvasTable.module.css'

/**
 * 表格网格：列标 A/B/C… + 行号 1/2/3… + 单元格
 * ------------------------------------------------------------
 * 纯渲染：选区、光标格、编辑态都由外面算好传进来。
 * 单元格尺寸通过 gridTemplateColumns 与 --cell-h 控制，
 * 所以拖动四角控制点改 cellW / cellH 时不会缩放文字。
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

export default function TableGrid({
  rows,
  cols,
  cells,
  cellW,
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
        gridTemplateColumns: `${TABLE_ROW_HEADER_W}px repeat(${cols}, ${cellW}px)`,
      }}
    >
      {/* 左上角空白格 */}
      <div className={styles.head} />
      {/* 列标 A B C … */}
      {Array.from({ length: cols }, (_, c) => (
        <div key={`col-${c}`} className={styles.head}>
          {colLetter(c)}
        </div>
      ))}
      {/* 行号 + 单元格 */}
      {Array.from({ length: rows }, (_, r) => (
        <Fragment key={`row-${r}`}>
          <div className={styles.head}>{r + 1}</div>
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
