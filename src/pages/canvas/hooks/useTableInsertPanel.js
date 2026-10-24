import { useCallback, useRef, useState } from 'react'

/* ============================================================
   表格插入面板状态
   ------------------------------------------------------------
   点击左侧「表格」按钮时显示，参考 Word 插入表格：
   每次打开都从 3×3 起算，面板里划选行列夹在 1~10 之间。
   ============================================================ */

/**
 * @returns {{ tablePanelOpen: boolean, tableRows: number, tableCols: number,
 *   tableBtnRef: object, toggleTablePanel: Function, closeTablePanel: Function, setTableSize: Function }}
 */
export function useTableInsertPanel() {
  const [tablePanelOpen, setTablePanelOpen] = useState(false)
  const [tableRows, setTableRows] = useState(3) // 选中的行数
  const [tableCols, setTableCols] = useState(3) // 选中的列数
  const tableBtnRef = useRef(null)

  const toggleTablePanel = useCallback(() => {
    if (tablePanelOpen) {
      setTablePanelOpen(false)
      return
    }
    // 每次打开都从 3×3 起算，和 Word 插入表格的默认值一致
    setTableRows(3)
    setTableCols(3)
    setTablePanelOpen(true)
  }, [tablePanelOpen])

  const closeTablePanel = useCallback(() => setTablePanelOpen(false), [])

  // 面板里划选行列：夹在 1~10 之间
  const setTableSize = useCallback((r, c) => {
    setTableRows(Math.max(1, Math.min(10, r)) || 1)
    setTableCols(Math.max(1, Math.min(10, c)) || 1)
  }, [])

  return {
    tablePanelOpen,
    tableRows,
    tableCols,
    tableBtnRef,
    toggleTablePanel,
    closeTablePanel,
    setTableSize,
  }
}
