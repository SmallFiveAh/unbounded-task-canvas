import { useEffect, useRef, useState, Fragment } from 'react'
import {
  TABLE_ROW_HEADER_W,
  tableCellW,
  tableCellH,
  getTableSize,
} from '../../constants/canvasTable'
import { cornerRadius } from '../../utils/canvasRadius'
import styles from './CanvasTable.module.css'

/**
 * 画布表格 —— 参考 Excel 的表格元素
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
 */

const colLetter = (i) => String.fromCharCode(65 + i) // A, B, C …

const cellKey = (r, c) => `${r}:${c}`

/** 同一个单元格两次按下视为「双击」的时间窗（毫秒） */
const DOUBLE_PRESS_MS = 400

/** 两个对角单元格之间的矩形范围（含端点）对应的 key 列表 */
function rectKeys(r1, c1, r2, c2) {
  const keys = []
  const rMin = Math.min(r1, r2)
  const rMax = Math.max(r1, r2)
  const cMin = Math.min(c1, c2)
  const cMax = Math.max(c1, c2)
  for (let r = rMin; r <= rMax; r += 1) {
    for (let c = cMin; c <= cMax; c += 1) keys.push(cellKey(r, c))
  }
  return keys
}

const keyToCoord = (key) => {
  const [r, c] = key.split(':').map(Number)
  return { r, c }
}

export default function CanvasTable({
  table,
  selected,
  onPointerDown,
  onActivate,
  onCellChange,
  onClearCells,
  scale = 1,
}) {
  const { rows, cols, cells } = table
  // 单元格尺寸可由画布上的四角控制点拖动改变（见 CanvasPage 的 applyResize）
  const cellW = tableCellW(table)
  const cellH = tableCellH(table)
  const size = getTableSize(table)

  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const dragRef = useRef(null) // 单元格框选状态
  const dblPressRef = useRef({ key: null, time: 0 }) // 自实现的双击判定基准

  const [anchor, setAnchor] = useState(null) // 范围起始格（Shift 扩展的支点）
  const [cursor, setCursor] = useState(null) // 活动格（键盘 / 编辑作用于它）
  const [selection, setSelection] = useState(() => new Set()) // Set<'r:c'>
  const [editing, setEditing] = useState(null) // { r, c }
  const [draft, setDraft] = useState('')

  // 属性变化时调整状态：表格取消选中即清除单元格选中/编辑态
  const [prevSelected, setPrevSelected] = useState(selected)
  if (prevSelected !== selected) {
    setPrevSelected(selected)
    if (!selected) {
      setAnchor(null)
      setCursor(null)
      setSelection(new Set())
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

  /**
   * 屏幕坐标 → 单元格坐标。
   * 通过 grid 的实测尺寸与设计尺寸之比换算缩放，因此不依赖外部 scale。
   * 表头行高与单元格共用 cellH，总高 = (rows + 1) * cellH（见 canvasTable.js）。
   * clamp=true 时越界夹到最近边缘（拖拽框选保持扩展到末行/末列）。
   */
  const cellFromPoint = (clientX, clientY, clamp) => {
    const grid = wrapRef.current?.querySelector('[data-grid]')
    if (!grid) return null
    const rect = grid.getBoundingClientRect()
    const kx = rect.width / (TABLE_ROW_HEADER_W + cols * cellW)
    const ky = rect.height / ((rows + 1) * cellH)
    if (!kx || !ky) return null
    const c = Math.floor(((clientX - rect.left) / kx - TABLE_ROW_HEADER_W) / cellW)
    const r = Math.floor(((clientY - rect.top) / ky - cellH) / cellH)
    const inside = r >= 0 && r < rows && c >= 0 && c < cols
    if (!inside && !clamp) return null
    return {
      r: Math.min(rows - 1, Math.max(0, r)),
      c: Math.min(cols - 1, Math.max(0, c)),
    }
  }

  /* ---------- 指针：单击选择 + 拖拽框选 ---------- */

  const handlePointerDown = (e) => {
    if (e.button !== 0) return
    if (editing) commitEditing()

    const cellEl = e.target.closest?.('[data-cell-r]')

    // 未命中单元格（表头/空白）：走原有表格拖拽逻辑
    if (!cellEl) {
      wrapRef.current?.focus({ preventScroll: true })
      onPointerDown(e, table)
      return
    }

    e.stopPropagation()
    e.preventDefault()

    const cell = {
      r: Number(cellEl.dataset.cellR),
      c: Number(cellEl.dataset.cellC),
    }

    // 双击进入编辑（自实现判定）：画布内 pointerdown 既做了 preventDefault，
    // 又对容器做了 setPointerCapture，原生 dblclick 会被吞掉或重定向到容器，
    // 导致事件目标不再是单元格。这里在「指针按下瞬间」用时间 + 同格判断，
    // 不依赖任何后端鼠标事件，因此稳定可靠。
    const now = performance.now()
    const lastPress = dblPressRef.current
    if (lastPress.key === cellKey(cell.r, cell.c) && now - lastPress.time <= DOUBLE_PRESS_MS) {
      dblPressRef.current = { key: null, time: 0 } // 重置，避免连续按下重复触发
      onActivate?.(table.id)
      startEdit(cell.r, cell.c)
      return
    }
    dblPressRef.current = { key: cellKey(cell.r, cell.c), time: now }

    const additive = e.ctrlKey || e.metaKey
    let base

    if (e.shiftKey) {
      // Shift：锚点 → 目标的矩形；Ctrl+Shift 叠加到现有选区
      const from = anchor ?? cell
      base = additive ? new Set(selection) : new Set()
      rectKeys(from.r, from.c, cell.r, cell.c).forEach((k) => base.add(k))
      setAnchor(from)
    } else if (additive) {
      // Ctrl/⌘：加入或移出选区
      base = new Set(selection)
      const key = cellKey(cell.r, cell.c)
      if (base.has(key)) base.delete(key)
      else base.add(key)
      setAnchor(cell)
    } else {
      base = new Set([cellKey(cell.r, cell.c)])
      setAnchor(cell)
    }

    setCursor(cell)
    setSelection(base)

    // 选中单元格即激活表格，让画布把它作为当前元素（键盘事件才会被接管）
    onActivate?.(table.id)

    // 记录拖拽基准：drag 过程中在 base 之上叠加「起点 → 当前格」的矩形
    dragRef.current = {
      base: new Set(base),
      start: cell,
      last: cell,
      moved: false,
    }
    wrapRef.current?.setPointerCapture(e.pointerId)
    wrapRef.current?.focus({ preventScroll: true })
  }

  const handlePointerMove = (e) => {
    const drag = dragRef.current
    if (!drag) return

    const cell = cellFromPoint(e.clientX, e.clientY, true)
    if (!cell) return
    if (cell.r === drag.last.r && cell.c === drag.last.c) return

    drag.last = cell
    // 尚未离开起始格时不改变选区（保证单击语义干净）
    if (!drag.moved) {
      if (cell.r === drag.start.r && cell.c === drag.start.c) return
      drag.moved = true
      // 真的在拖拽框选：作废双击基准，避免拖完后紧接着的一次按下被误判为双击
      dblPressRef.current = { key: null, time: 0 }
    }

    e.stopPropagation()
    const next = new Set(drag.base)
    rectKeys(drag.start.r, drag.start.c, cell.r, cell.c).forEach((k) => next.add(k))
    setSelection(next)
    setCursor(cell)
  }

  const handlePointerUp = (e) => {
    const drag = dragRef.current
    if (!drag) return // 表格整体拖拽由父级的视口事件收尾
    dragRef.current = null
    e.stopPropagation()
    if (wrapRef.current?.hasPointerCapture(e.pointerId)) {
      wrapRef.current.releasePointerCapture(e.pointerId)
    }
  }

  const handleDoubleClick = (e) => {
    e.stopPropagation() // 避免触发画布「双击空白添加节点」
    if (editing) return // pointerdown 已完成判定并进入编辑
    const cellEl = e.target.closest?.('[data-cell-r]')
    // 指针捕获后原生 dblclick 的 target 可能是容器本身，此时用坐标反查单元格兜底
    const cell = cellEl
      ? { r: Number(cellEl.dataset.cellR), c: Number(cellEl.dataset.cellC) }
      : cellFromPoint(e.clientX, e.clientY, false)
    if (cell) startEdit(cell.r, cell.c)
  }

  /* ---------- 键盘操作（窗口捕获阶段，不依赖焦点） ---------- */

  useEffect(() => {
    if (!selected) return

    const onKeyDown = (e) => {
      if (editing) return // 编辑中由输入框自行处理
      if (!cursor) return // 无活动单元格：交给画布处理（Esc 取消选中 / Delete 删除表格）

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

      const { r, c } = cursor
      const extend = e.shiftKey
      const additive = e.ctrlKey || e.metaKey

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
          return onClearCells?.(table.id, [...selection].map(keyToCoord))
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
  }, [selected, editing, cursor, anchor, selection, rows, cols, cells, table.id, onClearCells, onCellChange])

  /* ---------- 渲染 ---------- */

  // 选区外轮廓：与相邻未选中单元格相邻的那一侧画 1px 强调线，
  // 非连续选区也能为每个连通块各自描边。
  // 通过 CSS 变量传给 .cell.selected::after 覆盖层（见模块 CSS 注释）：
  // 覆盖层上 / 左外扩 1px、右 / 下含住本格边框，四条线才能全部骑在网格线上
  // （outline / inset box-shadow 都做不到一半在格外、一半在格内）。
  const sideVars = (r, c) => ({
    '--st': selection.has(cellKey(r - 1, c)) ? 0 : 1,
    '--sr': selection.has(cellKey(r, c + 1)) ? 0 : 1,
    '--sb': selection.has(cellKey(r + 1, c)) ? 0 : 1,
    '--sl': selection.has(cellKey(r, c - 1)) ? 0 : 1,
  })

  return (
    <div
      ref={wrapRef}
      data-table-id={table.id}
      tabIndex={-1}
      className={`${styles.table}${selected ? ` ${styles.selected}` : ''}`}
      style={{
        left: table.x,
        top: table.y,
        width: size.w,
        // 圆角随缩放补偿（缩小时仍看得出圆角，放大时不额外变圆）
        borderRadius: cornerRadius(5, size.w, size.h, scale),
        // 行高交给 CSS 变量：表头与单元格共用同一个值
        '--cell-h': `${cellH}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
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
                  }${isCursor ? ` ${styles.cursor}` : ''}`}
                  style={isSelected && !isEditing ? sideVars(r, c) : undefined}
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
                          selectOnly(r + 1, c)
                        } else if (e.key === 'Tab') {
                          e.preventDefault()
                          commitEditing()
                          selectOnly(r, c + 1)
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
