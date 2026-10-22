/* ============================================================
   画布表格 —— 数据与增删改
   ------------------------------------------------------------
   从 useCanvasDocument 拆出的表格专属 hook：
   只持有 tables 一个 useState，矩阵运算下沉到 lib/tableCells.js。
   选中态不在这里：通过 onSelect / onElementRemoved 回调交回上层。
   ============================================================ */

import { useCallback, useState } from 'react'
import { getTableSize } from '../../../constants/canvasTable'
import { createEmptyCells, clearCellsInMatrix, pasteBlockIntoTable } from '../lib/tableCells'

/**
 * @param {object} params
 * @param {Array<object>} params.initialTables                   首次挂载的初始表格（来自存档）
 * @param {(prefix: string) => string} params.nextId             id 生成器（由 useCanvasDocument 提供）
 * @param {(id: string) => void} params.onSelect                 新元素落地后同步选中
 * @param {(id: string) => void} params.onElementRemoved         元素删除后清理关联数据（如连线）
 * @param {import('react').MutableRefObject} params.viewportRef  视口容器（居中放置用）
 * @param {(x:number, y:number) => {x:number, y:number}} params.screenToWorld 屏幕坐标 → 世界坐标
 */
export function useCanvasTables({
  initialTables,
  nextId,
  onSelect,
  onElementRemoved,
  viewportRef,
  screenToWorld,
}) {
  const [tables, setTables] = useState(initialTables)

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
          cells: createEmptyCells(rows, cols),
        },
      ])
      onSelect(id)
    },
    [screenToWorld, nextId, onSelect, viewportRef],
  )

  const removeTable = useCallback(
    (id) => {
      setTables((ts) => ts.filter((t) => t.id !== id))
      // 表格也可能是连线端点：一并摘掉相关连线，与 removeNode 行为一致
      onElementRemoved(id)
    },
    [onElementRemoved],
  )

  // 批量删除（框选后按 Delete）：与 removeNodes 对称，一次 setState 删掉整批；
  // 连线清理与选中态收口交给 useCanvasDocument / 上层
  const removeTables = useCallback((ids) => {
    const removed = new Set(ids)
    if (!removed.size) return
    setTables((ts) => ts.filter((t) => !removed.has(t.id)))
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
      ts.map((t) => (t.id === tableId ? { ...t, cells: clearCellsInMatrix(t.cells, coords) } : t)),
    )
  }, [])

  /**
   * 粘贴一块二维文本到表格（Ctrl/⌘ + V）：
   * 从 (r0, c0) 开始铺开，放不下时按 Excel 的行为自动扩行扩列
   * （矩阵运算见 lib/tableCells.js 的 pasteBlockIntoTable）。
   */
  const pasteTableCells = useCallback((tableId, r0, c0, block) => {
    setTables((ts) =>
      ts.map((t) => {
        if (t.id !== tableId) return t
        const { rows, cols, cells } = pasteBlockIntoTable(t, r0, c0, block)
        return { ...t, rows, cols, cells }
      }),
    )
  }, [])

  return {
    tables,
    setTables,
    addTable,
    removeTable,
    removeTables,
    updateTableCell,
    clearTableCells,
    pasteTableCells,
  }
}
