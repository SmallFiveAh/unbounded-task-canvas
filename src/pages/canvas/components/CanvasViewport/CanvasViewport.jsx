import PropTypes from 'prop-types'
import { gridBackgroundStyle } from '../../lib/gridStyle'
import styles from '../../../CanvasPage.module.css'
import CanvasWorld from '../CanvasWorld'
import CanvasSelectionLayer from '../CanvasSelectionLayer'

/**
 * 无限画布视口（展示层）
 * ------------------------------------------------------------
 * 从 CanvasPage 拆出的视口区块：平移 / 缩放容器 + 世界层（连线 +
 * 节点 + 表格）+ 选中框层 + 空画布引导。容器 div 上挂着全部指针
 * 事件（拖拽 / 缩放 / 拉线 / 框选统一由 useViewportPointer 收口）。
 * 结构与拆分前逐节点一致，不引入任何包装元素。
 */

/**
 * @param {object} viewportRef              视口容器 ref
 * @param {string} tool                     当前工具（select / pan），驱动 data-tool 光标样式
 * @param {object} view                     视图状态 { x, y, scale }（网格背景与缩放）
 * @param {boolean} spaceDown               空格键按住中（临时平移态）
 * @param {object} pointer                  useCanvasInteractions 返回的指针事件处理器集合
 * @param {Function} onPointerDownCapture   捕获阶段的编辑提交兜底（useCommitNodeEdit）
 * @param {Array} nodes                     节点列表
 * @param {Array} tables                    表格列表
 * @param {object} drag                     useItemDrag 返回值（元素拖拽）
 * @param {object} selection                useCanvasSelection 返回值（选中 / 编辑态）
 * @param {object} doc                      useCanvasDocument 返回值（数据与增删改）
 * @param {Function} commitNodeEdit         编辑草稿落库回调
 * @param {Function} onDraftChange          编辑草稿变化回调（列表卡片行输入时自动追加空行）
 * @param {Array} edgeViews                 已落库连线的路径数据 [{ id, d }]
 * @param {string|null} edgePreviewPath     拉线预览路径（松手前）
 * @param {object|null} linkTargetRect      拉线悬停目标元素矩形（亮框提示）
 * @param {object} resize                   useSelectionResize 返回值（选中框与控制点缩放）
 * @param {object} edgeDrag                 useEdgeDrag 返回值（边框拉线）
 * @param {object} mind                     思维导图渲染数据与动作包
 *   （branchViews / metas / measure / toggleCollapse / addChild / onNodeClick）
 */
function CanvasViewport({
  viewportRef,
  tool,
  view,
  spaceDown,
  pointer,
  onPointerDownCapture,
  nodes,
  tables,
  drag,
  selection,
  doc,
  commitNodeEdit,
  onDraftChange,
  edgeViews,
  edgePreviewPath,
  linkTargetRect,
  resize,
  edgeDrag,
  mind,
}) {
  return (
    <div
      ref={viewportRef}
      data-canvas-viewport
      data-tool={tool}
      className={`${styles.viewport}${pointer.panning ? ` ${styles.panning}` : ''}${spaceDown ? ` ${styles.spacePan}` : ''}`}
      onPointerDown={pointer.onViewportPointerDown}
      onPointerDownCapture={onPointerDownCapture}
      onPointerMove={pointer.onViewportPointerMove}
      onPointerUp={pointer.onViewportPointerUp}
      onPointerCancel={pointer.onViewportPointerUp}
      onDoubleClick={pointer.onViewportDoubleClick}
      style={gridBackgroundStyle(view)}
    >
      {/* 世界层：平移 + 缩放（连线 + 节点 + 表格） */}
      <CanvasWorld
        view={view}
        nodes={nodes}
        tables={tables}
        edgeViews={edgeViews}
        previewPath={edgePreviewPath}
        selectedIds={selection.selectedIds}
        selectedId={selection.selectedId}
        editingId={selection.editingId}
        draft={selection.draft}
        scale={view.scale}
        drag={drag}
        selection={selection}
        doc={doc}
        commitNodeEdit={commitNodeEdit}
        onDraftChange={onDraftChange}
        mind={mind}
      />

      {/* 选中框层（屏幕坐标）：1px 定宽橙框 + 四角控制点 + 四边拉线命中条 + 框选矩形 */}
      <CanvasSelectionLayer
        rects={resize.selectionRects}
        view={view}
        selectedId={selection.selectedId}
        editingId={selection.editingId}
        resizeLabel={resize.resizeLabel}
        onResizeStart={resize.beginResize}
        onLinkStart={edgeDrag.beginEdgeDrag}
        linkTargetRect={linkTargetRect}
        marquee={pointer.marquee}
        viewportRef={viewportRef}
      />

      {/* 空画布引导 */}
      {nodes.length === 0 && tables.length === 0 && (
        <div className={styles.emptyOverlay}>
          <i className="bi bi-plus-square" aria-hidden="true"></i>
          <p>双击空白处，或点击「添加节点」开始创作</p>
        </div>
      )}
    </div>
  )
}

CanvasViewport.propTypes = {
  viewportRef: PropTypes.object.isRequired,
  tool: PropTypes.string.isRequired,
  view: PropTypes.object.isRequired,
  spaceDown: PropTypes.bool.isRequired,
  pointer: PropTypes.object.isRequired,
  onPointerDownCapture: PropTypes.func.isRequired,
  nodes: PropTypes.array.isRequired,
  tables: PropTypes.array.isRequired,
  drag: PropTypes.object.isRequired,
  selection: PropTypes.object.isRequired,
  doc: PropTypes.object.isRequired,
  commitNodeEdit: PropTypes.func.isRequired,
  onDraftChange: PropTypes.func.isRequired,
  edgeViews: PropTypes.array.isRequired,
  edgePreviewPath: PropTypes.string,
  linkTargetRect: PropTypes.object,
  resize: PropTypes.object.isRequired,
  edgeDrag: PropTypes.object.isRequired,
  mind: PropTypes.object,
}

export default CanvasViewport
