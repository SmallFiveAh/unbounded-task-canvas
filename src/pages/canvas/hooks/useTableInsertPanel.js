import { useCallback, useRef, useState } from 'react'
import { PANEL_ID } from '../lib/panelIds'

/* ============================================================
   表格插入面板状态
   ------------------------------------------------------------
   点击左侧「表格」按钮时显示，参考 Word 插入表格：
   每次打开都从 3×3 起算，面板里划选行列夹在 1~10 之间。

   显隐与其余五个样式面板共用 useActivePanel 的唯一槽位
   （open = activePanel === PANEL_ID.TABLE），所以表格面板
   同样受「任意时刻只有一个激活」约束。
   ============================================================ */

/**
 * @param {object} params
 * @param {string|null} params.activePanel 当前唯一激活的面板
 * @param {(id: string) => void} params.openPanel  打开指定面板
 * @param {(id: string) => void} params.closePanel 关闭指定面板
 * @returns {{ tablePanelOpen: boolean, tableRows: number, tableCols: number,
 *   tableBtnRef: object, toggleTablePanel: Function, closeTablePanel: Function, setTableSize: Function }}
 */
export function useTableInsertPanel({ activePanel, openPanel, closePanel }) {
  const [tableRows, setTableRows] = useState(3) // 选中的行数
  const [tableCols, setTableCols] = useState(3) // 选中的列数
  const tableBtnRef = useRef(null)

  const tablePanelOpen = activePanel === PANEL_ID.TABLE

  const toggleTablePanel = useCallback(() => {
    if (tablePanelOpen) {
      closePanel(PANEL_ID.TABLE)
      return
    }
    // 每次打开都从 3×3 起算，和 Word 插入表格的默认值一致
    setTableRows(3)
    setTableCols(3)
    openPanel(PANEL_ID.TABLE)
  }, [tablePanelOpen, closePanel, openPanel])

  const closeTablePanel = useCallback(
    () => closePanel(PANEL_ID.TABLE),
    [closePanel],
  )

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
