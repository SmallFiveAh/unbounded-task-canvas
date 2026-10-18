import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES, TASKS, buildCanvas } from '../constants/tasks'
import InsertTablePanel from '../components/InsertTablePanel/InsertTablePanel'
import CanvasTable from '../components/CanvasTable/CanvasTable'
import { getTableSize } from '../constants/canvasTable'
import styles from './CanvasPage.module.css'

/**
 * 无限画布页面
 * - 拖拽空白处平移，滚轮平移；激活「鼠标滚轮」按钮后滚轮缩放（每次 5%，光标为中心）
 * - Ctrl/⌘ + 滚轮也可缩放
 * - 双击空白添加节点，节点可拖拽、双击编辑、Delete 删除
 * - 任务卡片缩略图中的节点/连线作为初始内容
 */

const GRID_FINE = 24 // 细网格（世界坐标）
const GRID_MAJOR = 120 // 主网格
const MIN_SCALE = 0.2
const MAX_SCALE = 5 // 最大 500%
const NODE_W = 176
const NODE_H = 76

const clampScale = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))

export default function CanvasPage({ taskId }) {
  const task = TASKS.find((t) => String(t.id) === String(taskId))

  const initial = useMemo(
    () => (task ? buildCanvas(task) : { nodes: [], edges: [] }),
    [task],
  )

  const viewportRef = useRef(null)
  const idSeq = useRef(initial.nodes.length)

  const [nodes, setNodes] = useState(initial.nodes)
  const [edges, setEdges] = useState(initial.edges)
  const [tables, setTables] = useState([]) // 画布表格（Excel 风格）
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 })
  const [tool, setTool] = useState('select')
const [sideTool, setSideTool] = useState(null)
  // 表格插入面板：点击左侧「表格」按钮时显示，参考 Word 插入表格
  const [tablePanelOpen, setTablePanelOpen] = useState(false)
  const [tableRows, setTableRows] = useState(3) // 选中的行数
  const [tableCols, setTableCols] = useState(3) // 选中的列数
  const tableBtnRef = useRef(null)
  const sideToolbarRef = useRef(null)
  const [wheelZoom, setWheelZoom] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')
  const [panning, setPanning] = useState(false)
  const [marquee, setMarquee] = useState(null) // { x1, y1, x2, y2 } 屏幕坐标
  const [spaceDown, setSpaceDown] = useState(false)


  const panRef = useRef(null)
  const dragRef = useRef(null)
  const marqueeRef = useRef(null)

  /* ---------- 视图变换 ---------- */

  // 让一组节点在视口中居中（自适应 / 初次进入）
  const frameNodes = useCallback((targetNodes) => {
    const el = viewportRef.current
    if (!el) return
    const w = el.clientWidth
    const h = el.clientHeight

    if (targetNodes.length === 0) {
      setView({ x: w / 2, y: h / 2, scale: 1 })
      return
    }

    const minX = Math.min(...targetNodes.map((n) => n.x))
    const minY = Math.min(...targetNodes.map((n) => n.y))
    const maxX = Math.max(...targetNodes.map((n) => n.x + n.w))
    const maxY = Math.max(...targetNodes.map((n) => n.y + n.h))
    const bw = Math.max(maxX - minX, 1)
    const bh = Math.max(maxY - minY, 1)
    const padding = 140

    const scale = clampScale(
      Math.min((w - padding * 2) / bw, (h - padding * 2) / bh, 1.4),
    )
    setView({
      scale,
      x: w / 2 - (minX + bw / 2) * scale,
      y: h / 2 - (minY + bh / 2) * scale,
    })
  }, [])

  // 初次进入：自适应到任务内容
  useEffect(() => {
    frameNodes(initial.nodes)
    // 仅挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 以视口某点为锚点缩放
  const zoomAt = useCallback((anchorX, anchorY, factor) => {
    setView((v) => {
      const scale = clampScale(v.scale * factor)
      const ratio = scale / v.scale
      return {
        scale,
        x: anchorX - (anchorX - v.x) * ratio,
        y: anchorY - (anchorY - v.y) * ratio,
      }
    })
  }, [])

  const zoomByStep = useCallback(
    (factor) => {
      const el = viewportRef.current
      if (!el) return
      zoomAt(el.clientWidth / 2, el.clientHeight / 2, factor)
    },
    [zoomAt],
  )

  // 滚轮：Ctrl/⌘ + 滚轮缩放（含触控板捏合），其余平移；需非 passive 才能阻止页面缩放
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const onWheel = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mode = e.deltaMode === 1 ? 16 : 1 // 兼容“按行滚动”的设备
      if (wheelZoom || e.ctrlKey || e.metaKey) {
        // 鼠标滚轮按钮：固定 5% 缩放步长
        const factor = e.deltaY < 0 ? 1.05 : 0.95
        zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor)
      } else {
        setView((v) => ({
          ...v,
          x: v.x - e.deltaX * mode,
          y: v.y - e.deltaY * mode,
        }))
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt, wheelZoom])

  /* ---------- 节点操作 ---------- */

  const screenToWorld = useCallback(
    (clientX, clientY) => {
      const rect = viewportRef.current.getBoundingClientRect()
      return {
        x: (clientX - rect.left - view.x) / view.scale,
        y: (clientY - rect.top - view.y) / view.scale,
      }
    },
    [view],
  )

  const addNode = useCallback(
    (x, y, text = '新节点', kind = 'muted') => {
      idSeq.current += 1
      const id = `n-new-${idSeq.current}`
      setNodes((ns) => [...ns, { id, x, y, w: NODE_W, h: NODE_H, kind, text }])
      setSelectedId(id)
      return id
    },
    [],
  )

  const addNodeAtCenter = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const world = screenToWorld(
      el.getBoundingClientRect().left + el.clientWidth / 2,
      el.getBoundingClientRect().top + el.clientHeight / 2,
    )
    addNode(world.x - NODE_W / 2, world.y - NODE_H / 2)
  }, [addNode, screenToWorld])

  const removeNode = useCallback((id) => {
    setNodes((ns) => ns.filter((n) => n.id !== id))
    setEdges((es) => es.filter((e) => e.from !== id && e.to !== id))
    setSelectedId(null)
    setEditingId(null)
  }, [])

  /* ---------- 表格操作 ---------- */

  // 插入表格：在视口中央放置一个 rows × cols 的 Excel 风格表格
  const addTable = useCallback(
    (rows, cols) => {
      const el = viewportRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const world = screenToWorld(
        rect.left + el.clientWidth / 2,
        rect.top + el.clientHeight / 2,
      )
      const { w, h } = getTableSize(rows, cols)
      idSeq.current += 1
      const id = `t-new-${idSeq.current}`
      setTables((ts) => [
        ...ts,
        {
          id,
          x: world.x - w / 2,
          y: world.y - h / 2,
          rows,
          cols,
          cells: Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => ''),
          ),
        },
      ])
      setSelectedId(id)
    },
    [screenToWorld],
  )

  const removeTable = useCallback((id) => {
    setTables((ts) => ts.filter((t) => t.id !== id))
    setSelectedId(null)
  }, [])

  const updateTableCell = useCallback((tableId, r, c, value) => {
    setTables((ts) =>
      ts.map((t) =>
        t.id === tableId
          ? {
              ...t,
              cells: t.cells.map((row, ri) =>
                ri === r ? row.map((v, ci) => (ci === c ? value : v)) : row,
              ),
            }
          : t,
      ),
    )
  }, [])

  // 清空一组单元格（表格内多选后按 Delete）—— 一次更新，避免逐格 setState
  const clearTableCells = useCallback((tableId, coords) => {
    setTables((ts) =>
      ts.map((t) => {
        if (t.id !== tableId) return t
        const cells = t.cells.map((row) => [...row])
        coords.forEach(({ r, c }) => {
          if (cells[r] && c >= 0 && c < cells[r].length) cells[r][c] = ''
        })
        return { ...t, cells }
      }),
    )
  }, [])

  // 仅在画布上选中某个表格（不进入拖拽）
  const selectTable = useCallback((id) => {
    setSelectedIds([id])
    setSelectedId(id)
  }, [])

  /* ---------- 元素拖拽（节点 + 表格统一处理） ---------- */

  // 按下时决定拖拽集合：点击已选中的元素保持整组一起移动；
  // Ctrl/⌘ 单击切换选中；点击未选中元素则仅选中它
  const beginItemDrag = (e, itemId) => {
    let selected
    if (e.ctrlKey || e.metaKey) {
      selected = selectedIds.includes(itemId)
        ? selectedIds.filter((id) => id !== itemId)
        : [...selectedIds, itemId]
    } else if (selectedIds.includes(itemId)) {
      selected = selectedIds
    } else {
      selected = [itemId]
    }
    setSelectedIds(selected)
    setSelectedId(
      selected.includes(itemId) ? itemId : (selected[selected.length - 1] ?? null),
    )

    // 记录所有选中元素（节点 + 表格）的初始位置，一起拖拽
    const nodeById = new Map(nodes.map((n) => [n.id, n]))
    const tableById = new Map(tables.map((t) => [t.id, t]))
    dragRef.current = {
      px: e.clientX,
      py: e.clientY,
      nodeStarts: selected
        .filter((id) => nodeById.has(id))
        .map((id) => ({ id, x: nodeById.get(id).x, y: nodeById.get(id).y })),
      tableStarts: selected
        .filter((id) => tableById.has(id))
        .map((id) => ({ id, x: tableById.get(id).x, y: tableById.get(id).y })),
    }
  }

  // 移动：把指针位移换算为世界坐标，同步应用到所有选中元素
  const applyDragMove = (e) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = (e.clientX - drag.px) / view.scale
    const dy = (e.clientY - drag.py) / view.scale
    if (drag.nodeStarts.length) {
      const starts = new Map(drag.nodeStarts.map((s) => [s.id, s]))
      setNodes((ns) =>
        ns.map((n) => {
          const s = starts.get(n.id)
          return s ? { ...n, x: s.x + dx, y: s.y + dy } : n
        }),
      )
    }
    if (drag.tableStarts.length) {
      const starts = new Map(drag.tableStarts.map((s) => [s.id, s]))
      setTables((ts) =>
        ts.map((t) => {
          const s = starts.get(t.id)
          return s ? { ...t, x: s.x + dx, y: s.y + dy } : t
        }),
      )
    }
  }

  const endItemDrag = (e) => {
    dragRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  // 表格拖拽：与节点共用同一套选中/拖拽逻辑
  const onTablePointerDown = (e, table) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    beginItemDrag(e, table.id)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onTablePointerMove = applyDragMove

  const onTablePointerUp = endItemDrag

  // Delete 删除选中节点；Esc 取消编辑/选中；空格键切换平移模式
  useEffect(() => {
    const onKeyDown = (e) => {
      const target = e.target
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !isTyping) {
        e.preventDefault()
        // 表格 id 以 t- 开头；其余为节点
        if (String(selectedId).startsWith('t-')) {
          removeTable(selectedId)
        } else {
          removeNode(selectedId)
        }
      } else if (e.key === 'Escape') {
        setEditingId(null)
        setSelectedId(null)
      } else if (e.key === ' ' && !isTyping && !spaceDown) {
        // 空格键按下：进入临时平移模式（仅在选择工具下生效）
        e.preventDefault()
        setSpaceDown(true)
      }
    }
    const onKeyUp = (e) => {
      if (e.key === ' ') {
        setSpaceDown(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [selectedId, removeNode, removeTable, spaceDown])

  /* ---------- 画布平移 ---------- */

  const onViewportPointerDown = (e) => {
    // 仅响应主键在空白处的按下（节点会 stopPropagation）
    if (e.button !== 0) return

    // 空格键 + 选择工具：临时平移模式（拖拽空白平移）
    const spacePan = spaceDown && tool === 'select'

    // 选择工具（且未按空格）：开始框选
    if (tool === 'select' && !spacePan) {
      e.currentTarget.setPointerCapture(e.pointerId)
      marqueeRef.current = { x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY }
      setMarquee(marqueeRef.current)
      return
    }

    // 平移工具 / 空格临时平移：拖拽空白平移
    panRef.current = {
      px: e.clientX,
      py: e.clientY,
      vx: view.x,
      vy: view.y,
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    setPanning(true)
  }

  const onViewportPointerMove = (e) => {
    // 元素拖拽中：由视口兜底驱动（节点/表格上的移动事件会冒泡到这里）
    if (dragRef.current) {
      applyDragMove(e)
      return
    }

    // 框选中
    const mq = marqueeRef.current
    if (mq) {
      marqueeRef.current = { ...mq, x2: e.clientX, y2: e.clientY }
      setMarquee(marqueeRef.current)
      return
    }

    // 平移中
    const pan = panRef.current
    if (!pan) return
    if (Math.abs(e.clientX - pan.px) + Math.abs(e.clientY - pan.py) > 3) {
      pan.moved = true
    }
    setView((v) => ({ ...v, x: pan.vx + e.clientX - pan.px, y: pan.vy + e.clientY - pan.py }))
  }

  const onViewportPointerUp = (e) => {
    // 元素拖拽释放
    if (dragRef.current) {
      endItemDrag(e)
      return
    }

    // 框选释放
    const mq = marqueeRef.current
    if (mq) {
      marqueeRef.current = null
      setMarquee(null)
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      // 仅当框选有实际范围时才判定选中，否则视为点击空白取消选中
      const x1 = Math.min(mq.x1, mq.x2)
      const x2 = Math.max(mq.x1, mq.x2)
      const y1 = Math.min(mq.y1, mq.y2)
      const y2 = Math.max(mq.y1, mq.y2)
      if (x2 - x1 > 2 && y2 - y1 > 2) {
        // 框选：将屏幕矩形换算为世界坐标，命中节点与表格
        const rect = e.currentTarget.getBoundingClientRect()
        const wx1 = (x1 - rect.left - view.x) / view.scale
        const wy1 = (y1 - rect.top - view.y) / view.scale
        const wx2 = (x2 - rect.left - view.x) / view.scale
        const wy2 = (y2 - rect.top - view.y) / view.scale
        const hitNodes = nodes
          .filter(
            (n) =>
              n.x + n.w >= wx1 && n.x <= wx2 && n.y + n.h >= wy1 && n.y <= wy2,
          )
          .map((n) => n.id)
        const hitTables = tables
          .filter((t) => {
            const { w, h } = getTableSize(t.rows, t.cols)
            return t.x + w >= wx1 && t.x <= wx2 && t.y + h >= wy1 && t.y <= wy2
          })
          .map((t) => t.id)
        const hit = [...hitNodes, ...hitTables]
        setSelectedIds(hit)
        setSelectedId(hit[hit.length - 1] ?? null)
      } else {
        // 点击空白：取消选中
        setSelectedId(null)
        setSelectedIds([])
        setEditingId(null)
      }
      return
    }

    // 平移释放
    const pan = panRef.current
    panRef.current = null
    setPanning(false)
    if (pan && !pan.moved) {
      // 点击空白：取消选中
      setSelectedId(null)
      setSelectedIds([])
      setEditingId(null)
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const onViewportDoubleClick = (e) => {
    const world = screenToWorld(e.clientX, e.clientY)
    addNode(world.x - NODE_W / 2, world.y - NODE_H / 2)
  }

  /* ---------- 节点拖拽与编辑 ---------- */

  const onNodePointerDown = (e, node) => {
    if (editingId === node.id || e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    beginItemDrag(e, node.id)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onNodePointerMove = applyDragMove

  const onNodePointerUp = endItemDrag

  const startEdit = (node) => {
    setSelectedId(node.id)
    setEditingId(node.id)
    setDraft(node.text)
  }

  const commitEdit = () => {
    const text = draft.trim()
    if (text) {
      setNodes((ns) => ns.map((n) => (n.id === editingId ? { ...n, text } : n)))
    }
    setEditingId(null)
  }

  /* ---------- 渲染 ---------- */

  if (!task) {
    return (
      <div className={styles.notFound}>
        <i className="bi bi-exclamation-circle" aria-hidden="true"></i>
        <h1>未找到该任务</h1>
        <a href="/" className={styles.backLink}>
          返回任务列表
        </a>
      </div>
    )
  }

  const categoryLabel = CATEGORIES.find((c) => c.key === task.category)?.label

  // 高倍率下细网格跟着细分，避免 500% 时格距过大、画面发大块
  const gridSub = view.scale >= 4 ? 4 : view.scale >= 2 ? 2 : 1
  const fine = (GRID_FINE / gridSub) * view.scale
  const major = GRID_MAJOR * view.scale
  // 缩放过小时隐藏细网格，避免密集摩尔纹
  const fineColor = view.scale < 0.5 ? 'transparent' : 'var(--color-wash)'
  const gridPos = `${view.x}px ${view.y}px`

  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  return (
    <div className={styles.canvasPage}>
      {/* 顶部中间工具栏：选择 + 缩放 */}
      <div className={styles.toolbar} role="toolbar" aria-label="画布工具栏">
        <button
          type="button"
          className={`${styles.toolIconBtn}${tool === 'select' ? ` ${styles.active}` : ''}`}
          title="选择（单击节点选中，按住空格 + 拖拽平移画布）"
          onClick={() => setTool('select')}
        >
          <i className="bi bi-cursor" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          className={`${styles.toolIconBtn}${tool === 'pan' ? ` ${styles.active}` : ''}`}
          title="平移（拖拽空白处移动画布）"
          onClick={() => setTool((t) => (t === 'pan' ? 'select' : 'pan'))}
        >
          <i className="bi bi-hand-index" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          className={`${styles.toolIconBtn}${wheelZoom ? ` ${styles.active}` : ''}`}
          title="鼠标滚轮缩放（激活后滚轮直接缩放画布，每次 5%）"
          onClick={() => setWheelZoom((w) => !w)}
        >
          <i className="bi bi-mouse" aria-hidden="true"></i>
        </button>
      </div>

      {/* 左侧中间工具栏：便签 / 表格 / 思维导图 / 流程图 / 卡片 / 列表卡片 */}
      <div ref={sideToolbarRef} className={styles.sideToolbar} role="toolbar" aria-label="元素工具栏">
        <button
          type="button"
          className={`${styles.sideToolBtn}${sideTool === 'note' ? ` ${styles.active}` : ''}`}
          title="便签"
          onClick={() => setSideTool((t) => (t === 'note' ? null : 'note'))}
        >
          <i className="bi bi-sticky" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          ref={tableBtnRef}
          className={`${styles.sideToolBtn}${tablePanelOpen ? ` ${styles.active}` : ''}`}
          title="插入表格"
          onClick={() => {
            if (tablePanelOpen) {
              setTablePanelOpen(false)
            } else {
              setTableRows(3)
              setTableCols(3)
              setTablePanelOpen(true)
            }
          }}
        >
          <i className="bi bi-table" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          className={`${styles.sideToolBtn}${sideTool === 'mind' ? ` ${styles.active}` : ''}`}
          title="思维导图"
          onClick={() => setSideTool((t) => (t === 'mind' ? null : 'mind'))}
        >
          <i className="bi bi-diagram-3" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          className={`${styles.sideToolBtn}${sideTool === 'flow' ? ` ${styles.active}` : ''}`}
          title="流程图"
          onClick={() => setSideTool((t) => (t === 'flow' ? null : 'flow'))}
        >
          <i className="bi bi-diagram-2" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          className={`${styles.sideToolBtn}${sideTool === 'card' ? ` ${styles.active}` : ''}`}
          title="卡片"
          onClick={() => setSideTool((t) => (t === 'card' ? null : 'card'))}
        >
          <i className="bi bi-card-checklist" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          className={`${styles.sideToolBtn}${sideTool === 'list' ? ` ${styles.active}` : ''}`}
          title="列表卡片"
          onClick={() => setSideTool((t) => (t === 'list' ? null : 'list'))}
        >
          <i className="bi bi-list-ul" aria-hidden="true"></i>
        </button>
      </div>

      {/* 右下角浮层：缩放百分比 */}
      <div className={styles.topbar}>
        <div
          className={styles.zoomPercent}
          title="点击重置为 100%"
          onClick={() => zoomByStep(1 / view.scale)}
        >
          {Math.round(view.scale * 100)}%
        </div>
      </div>

      {/* 无限画布视口 */}
      <div
        ref={viewportRef}
        data-canvas-viewport
        data-tool={tool}
        className={`${styles.viewport}${panning ? ` ${styles.panning}` : ''}${spaceDown ? ` ${styles.spacePan}` : ''}`}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={onViewportPointerUp}
        onDoubleClick={onViewportDoubleClick}
        style={{
          backgroundImage: `radial-gradient(circle, ${fineColor} 1px, transparent 1px),
            radial-gradient(circle, var(--color-border) 2px, transparent 2px)`,
          backgroundSize: `${fine}px ${fine}px, ${major}px ${major}px`,
          backgroundPosition: `${gridPos}, ${gridPos}`,
        }}
      >
        {/* 世界层：平移 + 缩放 */}
        <div
          className={styles.world}
          style={{
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
          }}
        >
          {/* 连线层 */}
          <svg className={styles.edgeLayer} aria-hidden="true">
            <defs>
              <marker
                id="canvas-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" style={{ fill: 'var(--color-muted)' }} />
              </marker>
            </defs>
            {edges.map((edge) => {
              const from = nodeById.get(edge.from)
              const to = nodeById.get(edge.to)
              if (!from || !to) return null
              return (
                <line
                  key={edge.id}
                  x1={from.x + from.w / 2}
                  y1={from.y + from.h / 2}
                  x2={to.x + to.w / 2}
                  y2={to.y + to.h / 2}
                  className={styles.edge}
                  markerEnd="url(#canvas-arrow)"
                />
              )
            })}
          </svg>

          {/* 节点层 */}
          {nodes.map((node) => {
            const selected = selectedIds.includes(node.id)
            const primary = node.id === selectedId
            const editing = node.id === editingId
            return (
              <div
                key={node.id}
                data-node-id={node.id}
                className={`${styles.node} ${styles[node.kind]}${
                  selected ? ` ${styles.selected}` : ''
                }${primary ? ` ${styles.primary}` : ''}`}
                style={{ left: node.x, top: node.y, width: node.w, minHeight: node.h }}
                onPointerDown={(e) => onNodePointerDown(e, node)}
                onPointerMove={onNodePointerMove}
                onPointerUp={onNodePointerUp}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  startEdit(node)
                }}
              >
                {editing ? (
                  <textarea
                    className={styles.nodeInput}
                    value={draft}
                    autoFocus
                    rows={2}
                    onChange={(e) => setDraft(e.target.value)}
                    onPointerDown={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        commitEdit()
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        setEditingId(null)
                      }
                    }}
                  />
                ) : (
                  <span className={styles.nodeText}>{node.text}</span>
                )}
              </div>
            )
          })}

          {/* 表格层（Excel 风格） */}
          {tables.map((table) => (
            <CanvasTable
              key={table.id}
              table={table}
              selected={table.id === selectedId || selectedIds.includes(table.id)}
              onPointerDown={onTablePointerDown}
              onPointerMove={onTablePointerMove}
              onPointerUp={onTablePointerUp}
              onActivate={selectTable}
              onCellChange={updateTableCell}
              onClearCells={clearTableCells}
              scale={view.scale}
            />
          ))}

        </div>

        {/* 框选矩形（屏幕坐标，固定于视口） */}
        {marquee && (() => {
          const r = viewportRef.current.getBoundingClientRect()
          const x1 = Math.min(marquee.x1, marquee.x2) - r.left
          const y1 = Math.min(marquee.y1, marquee.y2) - r.top
          const x2 = Math.max(marquee.x1, marquee.x2) - r.left
          const y2 = Math.max(marquee.y1, marquee.y2) - r.top
          return (
            <div
              className={styles.marquee}
              style={{ left: `${x1}px`, top: `${y1}px`, width: `${x2 - x1}px`, height: `${y2 - y1}px` }}
              aria-hidden="true"
            />
          )
        })()}

        {/* 空画布引导 */}
        {nodes.length === 0 && tables.length === 0 && (
          <div className={styles.emptyOverlay}>
            <i className="bi bi-plus-square" aria-hidden="true"></i>
            <p>双击空白处，或点击「添加节点」开始创作</p>
          </div>
        )}
      </div>

      {/* 表格插入面板（点击左侧「表格」按钮显示，紧贴按钮右侧） */}
      <InsertTablePanel
        open={tablePanelOpen}
        rows={tableRows}
        cols={tableCols}
        anchorRef={tableBtnRef}
        toolbarRef={sideToolbarRef}
        onClose={() => setTablePanelOpen(false)}
        onConfirm={(r, c) => {
          // 在画布中央插入所选行列的表格
          addTable(r, c)
          setTablePanelOpen(false)
        }}
        onChange={(r, c) => {
          setTableRows(Math.max(1, Math.min(10, r)) || 1)
          setTableCols(Math.max(1, Math.min(10, c)) || 1)
        }}
      />
    </div>
  )
}
