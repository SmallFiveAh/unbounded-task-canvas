/* ============================================================
   画布内容 —— 节点 / 连线 / 表格的数据与增删改
   ------------------------------------------------------------
   这里是画布唯一的数据源（三个 useState），所有写操作都以「不可变更新」
   的方式产出新数组，方便上面的持久化 effect 用引用比较判断「是否变化」。
   选中态不在这里：需要顺带改选中的地方，通过 onSelect / onNodeRemoved /
   onTableRemoved 回调交给 useCanvasSelection。
   ============================================================ */

import { useCallback, useRef, useState } from 'react'
import { getTableSize } from '../../../constants/canvasTable'
import { NODE_H, NODE_W } from '../lib/constants'

export function useCanvasDocument({
  initial,
  viewportRef,
  screenToWorld,
  onSelect,
  onNodeRemoved,
  onTableRemoved,
}) {
  const [nodes, setNodes] = useState(initial.nodes)
  const [edges, setEdges] = useState(initial.edges)
  const [tables, setTables] = useState(initial.tables) // 画布表格（Excel 风格）
  const idSeq = useRef(0)

  const nextId = useCallback((prefix) => {
    idSeq.current += 1
    // 带上时间戳，避免与存档里上一轮生成的 id 撞车
    return `${prefix}-${Date.now().toString(36)}-${idSeq.current}`
  }, [])

  /* ---------- 节点 ---------- */

  const addNode = useCallback(
    (x, y, text = '新节点', kind = 'muted') => {
      const id = nextId('n')
      setNodes((ns) => [...ns, { id, x, y, w: NODE_W, h: NODE_H, kind, text }])
      // 选中集合与主选中同步：新节点落地即带选中框
      onSelect(id)
      return id
    },
    [nextId, onSelect],
  )

  const addNodeAtCenter = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const world = screenToWorld(
      el.getBoundingClientRect().left + el.clientWidth / 2,
      el.getBoundingClientRect().top + el.clientHeight / 2,
    )
    addNode(world.x - NODE_W / 2, world.y - NODE_H / 2)
  }, [addNode, screenToWorld, viewportRef])

  const removeNode = useCallback(
    (id) => {
      setNodes((ns) => ns.filter((n) => n.id !== id))
      setEdges((es) => es.filter((e) => e.from !== id && e.to !== id))
      onNodeRemoved(id)
    },
    [onNodeRemoved],
  )

  // 提交节点文案：空白内容视为「不改」，保留原文字
  const commitNodeText = useCallback((id, raw) => {
    const text = raw.trim()
    if (!text) return
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, text } : n)))
  }, [])

  /* ---------- 表格 ---------- */

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
      const { w, h } = getTableSize({ rows, cols })
      const id = nextId('t')
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
      onSelect(id)
    },
    [screenToWorld, nextId, onSelect, viewportRef],
  )

  const removeTable = useCallback(
    (id) => {
      setTables((ts) => ts.filter((t) => t.id !== id))
      onTableRemoved(id)
    },
    [onTableRemoved],
  )

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

  /**
   * 粘贴一块二维文本到表格（Ctrl/⌘ + V）：
   * 从 (r0, c0) 开始铺开，放不下时按 Excel 的行为自动扩行扩列 ——
   * 表格尺寸由 rows/cols 推导（见 getTableSize），所以只需补空格子即可。
   */
  const pasteTableCells = useCallback((tableId, r0, c0, block) => {
    setTables((ts) =>
      ts.map((t) => {
        if (t.id !== tableId) return t

        const blockW = Math.max(...block.map((row) => row.length))
        const rows = Math.max(t.rows, r0 + block.length)
        const cols = Math.max(t.cols, c0 + blockW)

        // 先按新尺寸补齐（保留原有内容，新增格子填空串）
        const cells = Array.from({ length: rows }, (_, r) => {
          const src = t.cells[r] ?? []
          return Array.from({ length: cols }, (_, c) => src[c] ?? '')
        })

        block.forEach((row, dr) => {
          row.forEach((value, dc) => {
            const r = r0 + dr
            const c = c0 + dc
            if (cells[r] && c < cols) cells[r][c] = value
          })
        })

        return { ...t, rows, cols, cells }
      }),
    )
  }, [])

  return {
    nodes,
    edges,
    tables,
    setNodes,
    setEdges,
    setTables,
    addNode,
    addNodeAtCenter,
    removeNode,
    commitNodeText,
    addTable,
    removeTable,
    updateTableCell,
    clearTableCells,
    pasteTableCells,
  }
}
