/* ============================================================
   画布工具栏状态
   ------------------------------------------------------------
   纯 UI 状态，不碰画布数据：
   · 当前工具（选择 / 平移）、鼠标滚轮缩放开关
   · 各元素样式面板的显隐与选中值（便签 / 思维导图 / 流程图 / 卡片 / 列表）
   · 表格插入面板的显隐与所选行列、以及面板定位用的两个 ref
   ============================================================ */

import { useCallback, useRef, useState } from 'react'
import {
  loadStoredNoteStyleId,
  saveStoredNoteStyleId,
} from '../../../constants/noteStyles'
import {
  loadStoredMindMapStyleId,
  saveStoredMindMapStyleId,
} from '../../../constants/mindMapStyles'
import {
  loadStoredListCardStyleId,
  saveStoredListCardStyleId,
} from '../../../constants/listCardStyles'
import {
  loadStoredCardStyleId,
  saveStoredCardStyleId,
} from '../../../constants/cardStyles'
import {
  loadStoredFlowChartNodeId,
  saveStoredFlowChartNodeId,
} from '../../../constants/flowchartStyles'

export function useCanvasToolbar() {
  const [tool, setTool] = useState('select')
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
  // 思维导图样式面板：点击左侧「思维导图」按钮时显示，样式选中后被记住
  // （localStorage 持久化，同便签面板）
  const [mindPanelOpen, setMindPanelOpen] = useState(false)
  const [mindStyleId, setMindStyleId] = useState(loadStoredMindMapStyleId)
  const mindBtnRef = useRef(null)
  // 列表卡片样式面板：点击左侧「列表卡片」按钮时显示，样式选中后被记住
  // （localStorage 持久化，同便签面板）
  const [listPanelOpen, setListPanelOpen] = useState(false)
  const [listStyleId, setListStyleId] = useState(loadStoredListCardStyleId)
  const listBtnRef = useRef(null)
  // 卡片样式面板：点击左侧「卡片」按钮时显示，样式选中后被记住
  // （localStorage 持久化，同便签面板）
  const [cardPanelOpen, setCardPanelOpen] = useState(false)
  const [cardStyleId, setCardStyleId] = useState(loadStoredCardStyleId)
  const cardBtnRef = useRef(null)
  // 流程图节点面板：点击左侧「流程图」按钮时显示，节点选中后被记住
  // （localStorage 持久化，同便签面板）
  const [flowPanelOpen, setFlowPanelOpen] = useState(false)
  const [flowNodeId, setFlowNodeId] = useState(loadStoredFlowChartNodeId)
  const flowBtnRef = useRef(null)

  const selectTool = useCallback(() => setTool('select'), [])

  // 平移工具：再点一次回到选择工具
  const togglePan = useCallback(
    () => setTool((t) => (t === 'pan' ? 'select' : 'pan')),
    [],
  )

  const toggleWheelZoom = useCallback(() => setWheelZoom((w) => !w), [])

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

  // 思维导图样式选中即记住：状态 + 本地存档同步落盘
  const selectMindStyle = useCallback((id) => {
    setMindStyleId(id)
    saveStoredMindMapStyleId(id)
  }, [])

  const toggleMindPanel = useCallback(() => setMindPanelOpen((o) => !o), [])

  const closeMindPanel = useCallback(() => setMindPanelOpen(false), [])

  // 列表卡片样式选中即记住：状态 + 本地存档同步落盘
  const selectListStyle = useCallback((id) => {
    setListStyleId(id)
    saveStoredListCardStyleId(id)
  }, [])

  const toggleListPanel = useCallback(() => setListPanelOpen((o) => !o), [])

  const closeListPanel = useCallback(() => setListPanelOpen(false), [])

  // 卡片样式选中即记住：状态 + 本地存档同步落盘
  const selectCardStyle = useCallback((id) => {
    setCardStyleId(id)
    saveStoredCardStyleId(id)
  }, [])

  const toggleCardPanel = useCallback(() => setCardPanelOpen((o) => !o), [])

  const closeCardPanel = useCallback(() => setCardPanelOpen(false), [])

  // 流程图节点选中即记住：状态 + 本地存档同步落盘
  const selectFlowNode = useCallback((id) => {
    setFlowNodeId(id)
    saveStoredFlowChartNodeId(id)
  }, [])

  const toggleFlowPanel = useCallback(() => setFlowPanelOpen((o) => !o), [])

  const closeFlowPanel = useCallback(() => setFlowPanelOpen(false), [])

  return {
    tool,
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
    toggleTablePanel,
    closeTablePanel,
    setTableSize,
    selectNoteStyle,
    toggleNotePanel,
    closeNotePanel,
    mindPanelOpen,
    mindStyleId,
    mindBtnRef,
    selectMindStyle,
    toggleMindPanel,
    closeMindPanel,
    listPanelOpen,
    listStyleId,
    listBtnRef,
    selectListStyle,
    toggleListPanel,
    closeListPanel,
    cardPanelOpen,
    cardStyleId,
    cardBtnRef,
    selectCardStyle,
    toggleCardPanel,
    closeCardPanel,
    flowPanelOpen,
    flowNodeId,
    flowBtnRef,
    selectFlowNode,
    toggleFlowPanel,
    closeFlowPanel,
  }
}
