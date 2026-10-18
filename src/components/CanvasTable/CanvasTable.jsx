import { Fragment, useEffect, useRef, useState } from 'react'
import { TABLE_ROW_HEADER_W, TABLE_COL_HEADER_H, TABLE_CELL_W, TABLE_CELL_H, getTableSize } from '../../constants/canvasTable'
import { collectCells, shiftRange, toggleCell, toggleRange } from '../../utils/cellSelection'
import styles from './CanvasTable.module.css'

/**
 * 画布表格 —— 参考 Excel 的表格元素
 * - 列标 A/B/C… + 行号 1/2/3…，网格线单元格
 * - 单击选中单元格（高亮框），双击 / 直接输入字符进入编辑
 * - Enter 确认并下移，Tab 确认并右移，Esc 取消编辑
 * - Delete/Backspace 清空活动单元格（不删除表格）；Esc 取消单元格选中后，Delete 删除整个表格
 * - 按住任意位置拖拽可移动表格（由父级 CanvasPage 处理拖拽）
 * - 键盘操作通过窗口捕获阶段监听，不依赖元素焦点
 * - 多选：Shift+Click 范围选，Ctrl+Click 增减，拖拽框选连续区域
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
  // 多选状态：已提交的选区（数组 [{r,c}]）
  const [selectedCells, setSelectedCells] = useState([])

  // 属性变化时调整状态：表格取消选中即清除单元格选中/编辑态
  const [prevSelected, setPrevSelected] = useState(selected)
  if (prevSelected !== selected) {
    setPrevSelected(selected)
    if (!selected) {
      setActiveCell(null)
      setEditing(null)
      setSelectedCells([])
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
    // 进入编辑时清除多选（保留活动格）
    setSelectedCells([{ r, c }])
    setDraft(initial ?? (cells[r]?.[c] ?? ''))
  }

  /* ============================================================
     单元格多选逻辑（内部 refs 管理，避免闭包陈旧问题）
     ============================================================ */
  const selectingRef = useRef({ active: false, r1: 0, c1: 0, r2: 0, c2: 0 })
  const lastClickedRef = useRef(null) // Shift 锚点 { r, c }
  const cellDownRef = useRef(null) // pointerdown 时的 { r, c, ctrl, shift, x, y }

  /** 将像素位移换算为 cell 格数（用于判断是否触发框选而非点击） */
  const pixelsToCells = (dx, dy) => {
    return {
      dc: Math.round(dx / TABLE_CELL_W),
      dr: Math.round(dy / TABLE_CELL_H),
    }
  }

  /**
   * 根据客户端坐标计算当前鼠标所在的单元格（行号、列号）
   * 返回 null 表示鼠标不在任何单元格内（如在表头区域）
   */
  const getCellAtPointer = (clientX, clientY) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return null
    const dx = clientX - rect.left - TABLE_ROW_HEADER_W
    const dy = clientY - rect.top - TABLE_COL_HEADER_H
    const c = Math.floor(dx / TABLE_CELL_W)
    const r = Math.floor(dy / TABLE_CELL_H)
    if (r < 0 || r >= rows || c < 0 || c >= cols) return null
    return { r, c }
  }

  const handleCellPointerDown = (e, r, c) => {
    e.stopPropagation()
    e.preventDefault()
    if (editing) commitEditing()

    const ctrl = e.ctrlKey || e.metaKey
    const shift = e.shiftKey

    cellDownRef.current = { r, c, ctrl, shift, x: e.clientX, y: e.clientY }

    // setPointerCapture：后续 move/up 事件重定向到此元素
    wrapRef.current?.setPointerCapture(e.pointerId)

    // 立即处理点击语义
    if (shift && lastClickedRef.current) {
      // Shift+Click：范围选择
      const anchor = lastClickedRef.current
      const cells = shiftRange(selectedCells, anchor, r, c, rows, cols)
      setSelectedCells(cells)
      setActiveCell({ r, c })
      lastClickedRef.current = { r, c }
    } else if (ctrl) {
      // Ctrl+Click：toggle 单个格
      const next = toggleCell(selectedCells, r, c)
      setSelectedCells(next)
      setActiveCell({ r, c })
      lastClickedRef.current = { r, c }
    } else {
      // 普通 Click：replace 为单格，重置锚点
      setSelectedCells([{ r, c }])
      setActiveCell({ r, c })
      lastClickedRef.current = { r, c }
    }

    wrapRef.current?.focus({ preventScroll: true })
  }

  const handleCellPointerMove = (e) => {
    if (!cellDownRef.current) return
    const { r: r1, c: c1 } = cellDownRef.current
    const dx = e.clientX - cellDownRef.current.x
    const dy = e.clientY - cellDownRef.current.y

    // 判断是"点击"还是"拖拽"：位移超过半个格子
    const { dc, dr } = pixelsToCells(dx, dy)
    if (Math.abs(dc) < 1 && Math.abs(dr) < 1) return // 仍视为点击，不触发布局变更

    // 计算当前鼠标所在的单元格
    const currentCell = getCellAtPointer(e.clientX, e.clientY)

    if (!selectingRef.current.active) {
      // 只有在单元格区域内才激活框选态
      if (currentCell !== null) {
        selectingRef.current = { active: true, r1, c1, r2: r1, c2: c1 }
        wrapRef.current?.classList.add(styles.selecting)
      } else {
        // 鼠标已离开单元格区域（如移到表头），不激活框选
        return
      }
    } else if (currentCell === null) {
      // 鼠标移出了单元格区域，取消框选态
      selectingRef.current = { active: false, r1: 0, c1: 0, r2: 0, c2: 0 }
      wrapRef.current?.classList.remove(styles.selecting)
      return
    }

    // 更新结束格（基于当前鼠标位置）
    const targetCell = currentCell ?? { r: Math.min(rows - 1, Math.max(0, r1 + dr)), c: Math.min(cols - 1, Math.max(0, c1 + dc)) }
    selectingRef.current.r2 = targetCell.r
    selectingRef.current.c2 = targetCell.c

    // 根据按键决定选区模式
    const cells = collectCells(rows, cols, r1, c1, targetCell.r, targetCell.c)
    if (cellDownRef.current.ctrl) {
      // Ctrl+拖拽：toggle 模式
      const next = toggleRange(selectedCells, r1, c1, targetCell.r, targetCell.c)
      setSelectedCells(next)
    } else {
      // 普通拖拽：replace 模式
      setSelectedCells(cells)
    }
    setActiveCell({ r: targetCell.r, c: targetCell.c })
  }

  const handleCellPointerUp = (e) => {
    if (!cellDownRef.current) return
    const { r: r1, c: c1 } = cellDownRef.current
    const dx = e.clientX - cellDownRef.current.x
    const dy = e.clientY - cellDownRef.current.y
    const { dc, dr } = pixelsToCells(dx, dy)

    // 如果几乎没移动（点击），不做额外处理（已在 down 时处理）
    if (Math.abs(dc) < 1 && Math.abs(dr) < 1) {
      selectingRef.current = { active: false, r1: 0, c1: 0, r2: 0, c2: 0 }
      wrapRef.current?.classList.remove(styles.selecting)
      cellDownRef.current = null
      return
    }

    // 计算释放时的单元格位置
    const currentCell = getCellAtPointer(e.clientX, e.clientY)
    const r2 = currentCell ? currentCell.r : Math.min(rows - 1, Math.max(0, r1 + dr))
    const c2 = currentCell ? currentCell.c : Math.min(cols - 1, Math.max(0, c1 + dc))
    const cells = collectCells(rows, cols, r1, c1, r2, c2)

    if (cellDownRef.current.ctrl) {
      setSelectedCells((prev) => toggleRange(prev, r1, c1, r2, c2))
    } else {
      setSelectedCells(cells)
    }
    setActiveCell({ r: r2, c: c2 })
    lastClickedRef.current = { r: r2, c: c2 }

    selectingRef.current = { active: false, r1: 0, c1: 0, r2: 0, c2: 0 }
    wrapRef.current?.classList.remove(styles.selecting)
    cellDownRef.current = null

    if (wrapRef.current?.hasPointerCapture(e.pointerId)) {
      wrapRef.current.releasePointerCapture(e.pointerId)
    }
  }

  const handlePointerDown = (e) => {
    if (e.button !== 0) return
    if (editing) commitEditing()

    const cellEl = e.target.closest?.('[data-cell-r]')
    if (cellEl) {
      const r = Number(cellEl.dataset.cellR)
      const c = Number(cellEl.dataset.cellC)
      handleCellPointerDown(e, r, c)
      return
    }

    // 未命中单元格（表头/空白）：走原有表格拖拽逻辑
    wrapRef.current?.focus({ preventScroll: true })
    onPointerDown(e, table)
  }

  const handleDoubleClick = (e) => {
    e.stopPropagation() // 避免触发画布「双击空白添加节点」
    if (editing) return
    // 拖拽用的 setPointerCapture 会把 dblclick 重定向到表格根元素，
    // e.target 命中不了单元格，此时按事件坐标重新定位
    const cellEl =
      e.target.closest?.('[data-cell-r]') ??
      document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-cell-r]')
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
      const clampRow = (nr) => Math.min(rows - 1, Math.max(0, nr))
      const clampCol = (nc) => Math.min(cols - 1, Math.max(0, nc))

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          // 方向键时清除多选（Excel 行为）
          setSelectedCells([{ r: clampRow(r - 1), c }])
          setActiveCell({ r: clampRow(r - 1), c })
          lastClickedRef.current = { r: clampRow(r - 1), c }
          return
        case 'ArrowDown':
          e.preventDefault()
          setSelectedCells([{ r: clampRow(r + 1), c }])
          setActiveCell({ r: clampRow(r + 1), c })
          lastClickedRef.current = { r: clampRow(r + 1), c }
          return
        case 'ArrowLeft':
          e.preventDefault()
          setSelectedCells([{ r, c: clampCol(c - 1) }])
          setActiveCell({ r, c: clampCol(c - 1) })
          lastClickedRef.current = { r, c: clampCol(c - 1) }
          return
        case 'ArrowRight':
        case 'Tab':
          e.preventDefault()
          setSelectedCells([{ r, c: clampCol(c + 1) }])
          setActiveCell({ r, c: clampCol(c + 1) })
          lastClickedRef.current = { r, c: clampCol(c + 1) }
          return
        case 'Enter':
          e.preventDefault()
          return startEdit(r, c)
        case 'Delete':
        case 'Backspace':
          // 清空所有选中单元格；无多选时退化为清空活动格
          e.preventDefault()
          e.stopPropagation()
          if (selectedCells.length > 1) {
            // 有多选：清空所有选中格
            for (const cell of selectedCells) {
              onCellChange(table.id, cell.r, cell.c, '')
            }
            setSelectedCells([{ r, c }])
          } else {
            return onCellChange(table.id, r, c, '')
          }
          return
        case 'Escape':
          // 取消多选选区（保留活动格）；再次 Esc 由画布取消表格选中
          e.stopPropagation()
          if (selectedCells.length > 1) {
            setSelectedCells([{ r, c }])
          } else {
            return setActiveCell(null)
          }
          return
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
  }, [selected, editing, activeCell, rows, cols, table.id, cells, onCellChange, selectedCells])

  return (
    <div
      ref={wrapRef}
      data-table-id={table.id}
      tabIndex={-1}
      className={`${styles.table}${selected ? ` ${styles.selected}` : ''}`}
      style={{ left: table.x, top: table.y, width: getTableSize(rows, cols).w }}
      onPointerDown={handlePointerDown}
      onPointerMove={handleCellPointerMove}
      onPointerUp={handleCellPointerUp}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `${TABLE_ROW_HEADER_W}px repeat(${cols}, ${TABLE_CELL_W}px)`,
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
              const isSelected = selectedCells.some((x) => x.r === r && x.c === c)
              const isEditing = editing && editing.r === r && editing.c === c
              return (
                <div
                  key={c}
                  data-cell-r={r}
                  data-cell-c={c}
                  className={`${styles.cell}${active ? ` ${styles.active}` : ''}${isSelected && !active ? ` ${styles.cellSelected}` : ''}`}
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
