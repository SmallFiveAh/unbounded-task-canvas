/* ============================================================
   画布工具栏状态
   ------------------------------------------------------------
   纯 UI 状态，不碰画布数据：
   · 当前工具（选择 / 平移）、鼠标滚轮缩放开关
   · 各元素样式面板的显隐与选中值（便签 / 思维导图 / 流程图 / 卡片 / 列表，
     面板通用语义见 usePanelState；表格插入面板见 useTableInsertPanel）
   · 以及面板定位用的左侧工具栏 ref
   返回值键名与拆分前完全一致，消费方（CanvasPage 等）无需改动。
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
import { usePanelState } from './usePanelState'
import { useTableInsertPanel } from './useTableInsertPanel'

export function useCanvasToolbar() {
  const [tool, setTool] = useState('select')
  const [wheelZoom, setWheelZoom] = useState(false)
  // 面板都是「紧贴按钮右侧」弹出：统一记录各自的锚点按钮
  const sideToolbarRef = useRef(null)

  // 五个样式面板：显隐 + 选中值（localStorage 持久化）+ 锚点 ref
  const note = usePanelState({ loadStored: loadStoredNoteStyleId, saveStored: saveStoredNoteStyleId })
  const mind = usePanelState({ loadStored: loadStoredMindMapStyleId, saveStored: saveStoredMindMapStyleId })
  const list = usePanelState({ loadStored: loadStoredListCardStyleId, saveStored: saveStoredListCardStyleId })
  const card = usePanelState({ loadStored: loadStoredCardStyleId, saveStored: saveStoredCardStyleId })
  const flow = usePanelState({ loadStored: loadStoredFlowChartNodeId, saveStored: saveStoredFlowChartNodeId })
  const tablePanel = useTableInsertPanel()

  const selectTool = useCallback(() => setTool('select'), [])

  // 平移工具：再点一次回到选择工具
  const togglePan = useCallback(
    () => setTool((t) => (t === 'pan' ? 'select' : 'pan')),
    [],
  )

  const toggleWheelZoom = useCallback(() => setWheelZoom((w) => !w), [])

  return {
    tool,
    wheelZoom,
    // 表格插入面板
    tablePanelOpen: tablePanel.tablePanelOpen,
    tableRows: tablePanel.tableRows,
    tableCols: tablePanel.tableCols,
    tableBtnRef: tablePanel.tableBtnRef,
    sideToolbarRef,
    // 便签样式面板
    notePanelOpen: note.open,
    noteStyleId: note.valueId,
    noteBtnRef: note.btnRef,
    selectNoteStyle: note.select,
    toggleNotePanel: note.toggle,
    closeNotePanel: note.close,
    // 思维导图样式面板
    mindPanelOpen: mind.open,
    mindStyleId: mind.valueId,
    mindBtnRef: mind.btnRef,
    selectMindStyle: mind.select,
    toggleMindPanel: mind.toggle,
    closeMindPanel: mind.close,
    // 列表卡片样式面板
    listPanelOpen: list.open,
    listStyleId: list.valueId,
    listBtnRef: list.btnRef,
    selectListStyle: list.select,
    toggleListPanel: list.toggle,
    closeListPanel: list.close,
    // 卡片样式面板
    cardPanelOpen: card.open,
    cardStyleId: card.valueId,
    cardBtnRef: card.btnRef,
    selectCardStyle: card.select,
    toggleCardPanel: card.toggle,
    closeCardPanel: card.close,
    // 流程图节点面板
    flowPanelOpen: flow.open,
    flowNodeId: flow.valueId,
    flowBtnRef: flow.btnRef,
    selectFlowNode: flow.select,
    toggleFlowPanel: flow.toggle,
    closeFlowPanel: flow.close,
    // 工具切换
    selectTool,
    togglePan,
    toggleWheelZoom,
    toggleTablePanel: tablePanel.toggleTablePanel,
    closeTablePanel: tablePanel.closeTablePanel,
    setTableSize: tablePanel.setTableSize,
  }
}
