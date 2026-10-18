import { useEffect, useRef, useState, Fragment } from 'react'
import { TABLE_ROW_HEADER_W, TABLE_COL_HEADER_H, getTableSize } from '../../constants/canvasTable'
import styles from './CanvasTable.module.css'

/**
 * 画布表格 —— 参考 Excel 的表格元素
 * - 列标 A/B/C… + 行号 1/2/3…，网格线单元格
 * - 单击选中单元格（高亮框），双击 / 直接输入字符进入编辑
 * - Enter 确认并下移，Tab 确认并右移，Esc 取消编辑
 * - Delete/Backspace 清空活动单元格（不删除表格）；Esc 取消单元格选中后，Delete 删除整个表格
 * - 按住表头 / 空白区域拖拽可移动表格（由父级 CanvasPage 处理拖拽）
 * - 键盘操作通过窗口捕获阶段监听，不依赖元素焦点
 */

const colLetter = (i) => String.fromCharCode(65 + i) // A, B, C …

export default function CanvasTable({
  table,
  selected,
  onPointerDown,
  onCellChange,
}) {
  const { rows, cols, cells } = table

  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const [activeCell, setActiveCell] = useState(null) // { r, c }
  const [editing, setEditing] = useState(null) // { r, c }
  const [draft, setDraft] = useState('')

  // 属性变化时调整状态：表格取消选中即清除单元格选中/编辑态
  const [prevSelected, setPrevSelected] = useState(selected)
  if (prevSelected !== selected) {
    setPrevSelected(selected)
    if (!selected) {
      setActiveCell(null)
      setEditing(null)
    }
  }

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
    onCellChange(table.id, editing.r, editing.c, draft)
    setEditing(null)
    setDraft('')
  }

  const moveActive = (r, c) => {
    setActiveCell({
      r: Math.min(rows - 1, Math.max(0, r)),
      c: Math.min(cols - 1, Math.max(0, c)),
    })
  }

  const startEdit = (r, c, initial) => {
    setActiveCell({ r, c })
    setEditing({ r, c })
    setDraft(initial ?? (cells[r]?.[c] ?? ''))
  }

  // 按下：命中单元格则选中该格；命中表头/空白则走表格拖拽逻辑（父级处理）
  const handlePointerDown = (e) => {
    if (e.button !== 0) return
    if (editing) commitEditing()

    const cellEl = e.target.closest?.('[data-cell-r]')
    if (cellEl) {
      e.stopPropagation()
      e.preventDefault()
      setActiveCell({
        r: Number(cellEl.dataset.cellR),
        c: Number(cellEl.dataset.cellC),
      })
      wrapRef.current?.focus({ preventScroll: true })
      return
    }

    // 未命中单元格（表头/空白）：走原有表格拖拽逻辑
    wrapRef.current?.focus({ preventScroll: true })
    onPointerDown(e, table)
  }

  const handleDoubleClick = (e) => {
    e.stopPropagation() // 避免触发画布「双击空白添加节点」
    if (editing) return
    const cellEl = e.target.closest?.('[data-cell-r]')
    if (cellEl) {
      startEdit(Number(cellEl.dataset.cellR), Number(cellEl.dataset.cellC))
    }
  }

  /* ---------- 键盘操作（窗口捕获阶段，不依赖焦点） ---------- */

  useEffect(() => {
    if (!selected) return

    const onKeyDown = (e) => {
      if (editing) return // 编辑中由输入框自行处理
      if (!activeCell) return // 无活动单元格：交给画布处理（Esc 取消选中 / Delete 删除表格）

      const target = e.target
      // 焦点在表格内或无具体焦点（body）时才接管，避免劫持工具栏、面板等处的按键
      const inTable = wrapRef.current?.contains(target)
      if (!inTable && target !== document.body) return
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const { r, c } = activeCell

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          moveActive(r - 1, c)
          return
        case 'ArrowDown':
          e.preventDefault()
          moveActive(r + 1, c)
          return
        case 'ArrowLeft':
          e.preventDefault()
          moveActive(r, c - 1)
          return
        case 'ArrowRight':
        case 'Tab':
          e.preventDefault()
          moveActive(r, c + 1)
          return
        case 'Enter':
          e.preventDefault()
          return startEdit(r, c)
        case 'Delete':
        case 'Backspace':
          // 清空活动单元格（不删除表格）
          e.preventDefault()
          e.stopPropagation()
          return onCellChange(table.id, r, c, '')
        case 'Escape':
          // 取消单元格选中；再次 Esc 由画布取消表格选中
          e.stopPropagation()
          return setActiveCell(null)
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
  }, [selected, editing, activeCell, rows, cols, table.id, cells, onCellChange])

  return (
    <div
      ref={wrapRef}
      data-table-id={table.id}
      tabIndex={-1}
      className={`${styles.table}${selected ? ` ${styles.selected}` : ''}`}
      style={{ left: table.x, top: table.y, width: getTableSize(rows, cols).w }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `${TABLE_ROW_HEADER_W}px repeat(${cols}, 96px)`,
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
              const active = activeCell && activeCell.r === r && activeCell.c === c
              const isEditing = editing && editing.r === r && editing.c === c
              return (
                <div
                  key={c}
                  data-cell-r={r}
                  data-cell-c={c}
                  className={`${styles.cell}${active ? ` ${styles.active}` : ''}`}
                >
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      className={styles.cellInput}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onPointerDown={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      onBlur={commitEditing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          commitEditing()
                          moveActive(r + 1, c)
                        } else if (e.key === 'Tab') {
                          e.preventDefault()
                          commitEditing()
                          moveActive(r, c + 1)
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          setEditing(null)
                          setDraft('')
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
    </div>
  )
}
