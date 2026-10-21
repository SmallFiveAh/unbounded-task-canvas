/* ============================================================
   画布工具栏状态
   ------------------------------------------------------------
   纯 UI 状态，不碰画布数据：
   · 当前工具（选择 / 平移）、鼠标滚轮缩放开关
   · 左侧元素工具栏的当前选中项（便签 / 思维导图 / 流程图 / 卡片 / 列表）
   · 表格插入面板的显隐与所选行列、以及面板定位用的两个 ref
   ============================================================ */

import { useCallback, useRef, useState } from 'react'
import {
  loadStoredNoteStyleId,
  saveStoredNoteStyleId,
} from '../../../constants/noteStyles'

export function useCanvasToolbar() {
  const [tool, setTool] = useState('select')
  const [sideTool, setSideTool] = useState(null)
  const [wheelZoom, setWheelZoom] = useState(false)
  // 表格插入面板：点击左侧「表格」按钮时显示，参考 Word 插入表格
  const [tablePanelOpen, setTablePanelOpen] = useState(false)
  const [tableRows, setTableRows] = useState(3) // 选中的行数
  const [tableCols, setTableCols] = useState(3) // 选中的列数
  const tableBtnRef = useRef(null)
  const sideToolbarRef = useRef(null)
  // 便签样式面板：点击左侧「便签」按钮时显示，样式选中后被记住
  // （localStorage 持久化，面板关了、下次会话都记得住）
  const [notePanelOpen, setNotePanelOpen] = useState(false)
  const [noteStyleId, setNoteStyleId] = useState(loadStoredNoteStyleId)
  const noteBtnRef = useRef(null)

  const selectTool = useCallback(() => setTool('select'), [])

  // 平移工具：再点一次回到选择工具
  const togglePan = useCallback(
    () => setTool((t) => (t === 'pan' ? 'select' : 'pan')),
    [],
  )

  const toggleWheelZoom = useCallback(() => setWheelZoom((w) => !w), [])

  // 左侧工具：再点一次取消
  const toggleSideTool = useCallback(
    (key) => setSideTool((t) => (t === key ? null : key)),
    [],
  )

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

  // 便签样式选中即记住：状态 + 本地存档同步落盘
  const selectNoteStyle = useCallback((id) => {
    setNoteStyleId(id)
    saveStoredNoteStyleId(id)
  }, [])

  const toggleNotePanel = useCallback(() => setNotePanelOpen((o) => !o), [])

  const closeNotePanel = useCallback(() => setNotePanelOpen(false), [])

  return {
    tool,
    sideTool,
    wheelZoom,
    tablePanelOpen,
    tableRows,
    tableCols,
    tableBtnRef,
    sideToolbarRef,
    notePanelOpen,
    noteStyleId,
    noteBtnRef,
    selectTool,
    togglePan,
    toggleWheelZoom,
    toggleSideTool,
    toggleTablePanel,
    closeTablePanel,
    setTableSize,
    selectNoteStyle,
    toggleNotePanel,
    closeNotePanel,
  }
}
