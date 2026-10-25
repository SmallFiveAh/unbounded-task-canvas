import PropTypes from 'prop-types'
import InsertTablePanel from '../../../../components/InsertTablePanel/InsertTablePanel'
import { CardDragGhost, CardStylePanel } from '../../../../components/CardStylePanel'
import { ListCardDragGhost, ListCardStylePanel } from '../../../../components/ListCardStylePanel'
import { MindMapStylePanel } from '../../../../components/MindMapStylePanel'
import FlowChartStylePanel from '../../../../components/FlowChartStylePanel'
import { NoteDragGhost, NoteStylePanel } from '../../../../components/NoteStylePanel'

/**
 * 画布页的全部插入 / 样式面板 + 便签 / 卡片拖拽幽灵（展示层）
 * ------------------------------------------------------------
 * 从 CanvasPage 拆出的纯编排展示块：面板显隐与选中值都来自
 * useCanvasToolbar（toolbar），按住拖拽创建分别来自
 * useNoteDragCreate（noteDrag）、useCardDragCreate（cardDrag）与
 * useListCardDragCreate（listDrag）。
 * 返回 Fragment：不改变 .canvasPage 下的 DOM 结构，样式命中与拆分前一致。
 */

/**
 * @param {object} toolbar       useCanvasToolbar 返回值（面板显隐 / 选中值 / 锚点 ref / 开关回调）
 * @param {object} noteDrag      useNoteDragCreate 返回值（press 按压发起拖拽 / ghost 幽灵位置）
 * @param {object} cardDrag      useCardDragCreate 返回值（press 按压发起拖拽 / ghost 幽灵位置）
 * @param {object} listDrag      useListCardDragCreate 返回值（press 按压发起拖拽 / ghost 幽灵位置）
 * @param {object} view          视口状态（幽灵尺寸随画布缩放同步）
 * @param {Function} onInsertTable (rows, cols) => void 在画布中央插入表格
 */
function CanvasPanels({ toolbar, noteDrag, cardDrag, listDrag, view, onInsertTable }) {
  return (
    <>
      {/* 表格插入面板（点击左侧「表格」按钮显示，紧贴按钮右侧） */}
      <InsertTablePanel
        open={toolbar.tablePanelOpen}
        rows={toolbar.tableRows}
        cols={toolbar.tableCols}
        anchorRef={toolbar.tableBtnRef}
        toolbarRef={toolbar.sideToolbarRef}
        onClose={toolbar.closeTablePanel}
        onConfirm={(r, c) => {
          // 在画布中央插入所选行列的表格
          onInsertTable(r, c)
          toolbar.closeTablePanel()
        }}
        onChange={toolbar.setTableSize}
      />

      {/* 便签样式面板（点击左侧「便签」按钮显示，紧贴按钮右侧）：
          点缩略图记住样式；按住缩略图可直接拖到画布，拖拽中面板保持可见 */}
      <NoteStylePanel
        open={toolbar.notePanelOpen}
        anchorRef={toolbar.noteBtnRef}
        toolbarRef={toolbar.sideToolbarRef}
        selectedId={toolbar.noteStyleId}
        onSelect={toolbar.selectNoteStyle}
        onClose={toolbar.closeNotePanel}
        onSwatchPress={(e, styleId) => noteDrag.press(e, styleId, () => toolbar.selectNoteStyle(styleId))}
      />

      {/* 思维导图样式面板（点击左侧「思维导图」按钮显示，紧贴按钮右侧）：
          点缩略图记住样式，交互与便签面板一致 */}
      <MindMapStylePanel
        open={toolbar.mindPanelOpen}
        anchorRef={toolbar.mindBtnRef}
        toolbarRef={toolbar.sideToolbarRef}
        selectedId={toolbar.mindStyleId}
        onSelect={toolbar.selectMindStyle}
        onClose={toolbar.closeMindPanel}
      />

      {/* 流程图节点面板（点击左侧「流程图」按钮显示，紧贴按钮右侧）：
          点缩略图记住节点，位置 / 关闭交互与便签面板一致 */}
      <FlowChartStylePanel
        open={toolbar.flowPanelOpen}
        anchorRef={toolbar.flowBtnRef}
        toolbarRef={toolbar.sideToolbarRef}
        selectedId={toolbar.flowNodeId}
        onSelect={toolbar.selectFlowNode}
        onClose={toolbar.closeFlowPanel}
      />

      {/* 列表卡片样式面板（点击左侧「列表卡片」按钮显示，紧贴按钮右侧）：
          点缩略图记住样式；按住缩略图可直接拖到画布，位置 / 关闭交互与便签面板一致 */}
      <ListCardStylePanel
        open={toolbar.listPanelOpen}
        anchorRef={toolbar.listBtnRef}
        toolbarRef={toolbar.sideToolbarRef}
        selectedId={toolbar.listStyleId}
        onSelect={toolbar.selectListStyle}
        onClose={toolbar.closeListPanel}
        onSwatchPress={(e, styleId) => listDrag.press(e, styleId, () => toolbar.selectListStyle(styleId))}
      />

      {/* 卡片样式面板（点击左侧「卡片」按钮显示，紧贴按钮右侧）：
          点缩略图记住样式；按住缩略图可直接拖到画布，位置 / 关闭交互与便签面板一致 */}
      <CardStylePanel
        open={toolbar.cardPanelOpen}
        anchorRef={toolbar.cardBtnRef}
        toolbarRef={toolbar.sideToolbarRef}
        selectedId={toolbar.cardStyleId}
        onSelect={toolbar.selectCardStyle}
        onClose={toolbar.closeCardPanel}
        onSwatchPress={(e, styleId) => cardDrag.press(e, styleId, () => toolbar.selectCardStyle(styleId))}
      />

      {/* 便签拖拽幽灵：按住拖动时钉在光标下方，尺寸随画布缩放同步 */}
      <NoteDragGhost ghost={noteDrag.ghost} scale={view.scale} />

      {/* 卡片拖拽幽灵：按住拖动时钉在光标下方，尺寸随画布缩放同步 */}
      <CardDragGhost ghost={cardDrag.ghost} scale={view.scale} />

      {/* 列表卡片拖拽幽灵：按住拖动时钉在光标下方，尺寸随画布缩放同步 */}
      <ListCardDragGhost ghost={listDrag.ghost} scale={view.scale} />
    </>
  )
}

CanvasPanels.propTypes = {
  toolbar: PropTypes.object.isRequired,
  noteDrag: PropTypes.object.isRequired,
  cardDrag: PropTypes.object.isRequired,
  listDrag: PropTypes.object.isRequired,
  view: PropTypes.object.isRequired,
  onInsertTable: PropTypes.func.isRequired,
}

export default CanvasPanels
