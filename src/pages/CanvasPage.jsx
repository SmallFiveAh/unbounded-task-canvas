import { useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'
import InsertTablePanel from '../components/InsertTablePanel/InsertTablePanel'
import { NoteDragGhost, NoteStylePanel } from '../components/NoteStylePanel'
import { TASKS } from '../constants/tasks'
import { EMPTY_CANVAS, loadCanvas } from '../utils/canvasStore'
import CanvasSaveHint from './canvas/components/CanvasSaveHint'
import CanvasSelectionLayer from './canvas/components/CanvasSelectionLayer'
import CanvasSideToolbar from './canvas/components/CanvasSideToolbar'
import CanvasToolbar from './canvas/components/CanvasToolbar'
import CanvasWorld from './canvas/components/CanvasWorld'
import CanvasZoomBadge from './canvas/components/CanvasZoomBadge'
import { useCanvasDocument } from './canvas/hooks/useCanvasDocument'
import { useCanvasInteractions } from './canvas/hooks/useCanvasInteractions'
import { useCanvasKeyboard } from './canvas/hooks/useCanvasKeyboard'
import { useCanvasPersistence } from './canvas/hooks/useCanvasPersistence'
import { useCanvasSelection } from './canvas/hooks/useCanvasSelection'
import { useCanvasToolbar } from './canvas/hooks/useCanvasToolbar'
import { useCanvasViewport } from './canvas/hooks/useCanvasViewport'
import { useNoteDragCreate } from './canvas/hooks/useNoteDragCreate'
import { previewEdgePath, resolveEdgePath } from './canvas/lib/edges'
import { gridBackgroundStyle } from './canvas/lib/gridStyle'
import styles from './CanvasPage.module.css'

/**
 * 无限画布页面（编排层）
 * ------------------------------------------------------------
 * 这里只做四件事：解析任务、串起各功能 hook、拼装视图、摆页面骨架。
 *
 * canvas/hooks/     行为（每个文件一个关注点；指针交互统一由
 *                   useCanvasInteractions 编排拖拽/缩放/拉线/收口）
 * canvas/components/ 展示（一个组件一个目录：jsx + module.css + index.js）
 * canvas/lib/       纯函数与常量（不依赖 React）
 *
 * 行为约定（与拆分前一致）：
 * - 拖拽空白处平移，滚轮平移；激活「鼠标滚轮」按钮后滚轮缩放（每次 5%，光标为中心）
 * - Ctrl/⌘ + 滚轮也可缩放；双击空白添加节点，节点可拖拽、双击编辑、Delete 删除
 * - 选中后出现 1px 橙色选中框 + 四角控制点，四边可拉出连线（贝塞尔 + 实心箭头）
 * - 内容与视图都持久化到 localStorage；任务列表缩略图实时同步结构
 */
export default function CanvasPage({ taskId }) {
  const task = TASKS.find((t) => String(t.id) === String(taskId))

  // 首次进入：优先读取本地存档，没有存档才用常量数据生成初始画布
  const initial = useMemo(
    () => (task ? loadCanvas(task) : EMPTY_CANVAS),
    [task],
  )

  /* ---------- 工具栏 / 插入面板 / 视口 / 选中态 ---------- */

  const toolbar = useCanvasToolbar()
  const { viewportRef, view, setView, viewRef, initialView, zoomByStep, screenToWorld } =
    useCanvasViewport({ initial, wheelZoom: toolbar.wheelZoom })
  const selection = useCanvasSelection()

  const doc = useCanvasDocument({
    initial,
    viewportRef,
    screenToWorld,
    onSelect: selection.selectOnly,
    onNodeRemoved: selection.removeNodeFromSelection,
    onTableRemoved: selection.removeTableFromSelection,
  })

  const { spaceDown } = useCanvasKeyboard({
    selectedId: selection.selectedId,
    removeNode: doc.removeNode,
    removeTable: doc.removeTable,
    clearSelection: selection.clearSelection,
  })

  // 指针交互编排：元素拖拽 / 控制点缩放 / 边框拉线 / 视口收口
  const { drag, resize, edgeDrag, pointer } = useCanvasInteractions({
    doc,
    selection,
    view,
    setView,
    tool: toolbar.tool,
    spaceDown,
    viewportRef,
    screenToWorld,
    addNode: doc.addNode,
  })

  // 便签拖拽创建：按住「便签」按钮 / 面板缩略图拖到画布落节点
  const noteDrag = useNoteDragCreate({
    viewportRef,
    screenToWorld,
    addNode: doc.addNode,
  })

  const { savedHintRef } = useCanvasPersistence({
    task,
    initial,
    initialView,
    nodes: doc.nodes,
    edges: doc.edges,
    tables: doc.tables,
    view,
    viewRef,
  })

  /* ---------- 节点编辑 ---------- */

  // 节点文案落库：空白内容视为「不改」，只退出编辑态。
  // useCallback 固定身份：它是每个 memo 化节点子组件的 prop，
  // 每帧换新引用会把 memo 浅比较打穿（拖拽期间全量重渲染）
  const commitNodeEdit = useCallback(() => {
    doc.commitNodeText(selection.editingId, selection.draft)
    selection.stopEditing()
  }, [doc.commitNodeText, selection.editingId, selection.draft, selection.stopEditing])

  /* ---------- 派生视图数据 ---------- */

  const { nodes, edges, tables } = doc

  // 落库连线与拉线预览共用同一套锚点换算（元素索引由 useEdgeDrag 统一维护）
  const edgeViews = useMemo(
    () =>
      edges
        .map((edge) => ({ id: edge.id, d: resolveEdgePath(edge, edgeDrag.elementIndex) }))
        .filter((edge) => edge.d),
    [edges, edgeDrag.elementIndex],
  )
  const edgePreviewPath = edgeDrag.preview
    ? previewEdgePath(edgeDrag.preview, edgeDrag.elementIndex)
    : null
  // 拉线悬停的目标元素：亮框提示「松手即连接」
  const linkTargetRect = edgeDrag.preview?.targetId
    ? edgeDrag.elementIndex.get(edgeDrag.preview.targetId)
    : null

  if (!task) return <TaskNotFound />

  return (
    <div className={styles.canvasPage}>
      {/* 右上角：本地保存提示（仅在数据发生变化时出现，5 秒后淡出） */}
      <CanvasSaveHint hintRef={savedHintRef} />

      {/* 顶部中间工具栏 + 左侧中间工具栏 + 右下角缩放徽标 */}
      <CanvasToolbar
        tool={toolbar.tool}
        wheelZoom={toolbar.wheelZoom}
        onSelectTool={toolbar.selectTool}
        onTogglePan={toolbar.togglePan}
        onToggleWheelZoom={toolbar.toggleWheelZoom}
      />
      <CanvasSideToolbar
        sideTool={toolbar.sideTool}
        tablePanelOpen={toolbar.tablePanelOpen}
        notePanelOpen={toolbar.notePanelOpen}
        tableBtnRef={toolbar.tableBtnRef}
        noteBtnRef={toolbar.noteBtnRef}
        toolbarRef={toolbar.sideToolbarRef}
        onToggleSideTool={toolbar.toggleSideTool}
        onToggleTablePanel={toolbar.toggleTablePanel}
        onNotePress={(e) => noteDrag.press(e, toolbar.noteStyleId, toolbar.toggleNotePanel)}
        onNoteClick={(e) => {
          // 指针点击已在 pointerup 阶段由 useNoteDragCreate 的 onClick 处理；
          // 这里只响应键盘激活的 click（detail === 0），否则会开→关双切换
          if (e.detail === 0) toolbar.toggleNotePanel()
        }}
      />
      <CanvasZoomBadge scale={view.scale} onReset={() => zoomByStep(1 / view.scale)} />

      {/* 无限画布视口 */}
      <div
        ref={viewportRef}
        data-canvas-viewport
        data-tool={toolbar.tool}
        className={`${styles.viewport}${pointer.panning ? ` ${styles.panning}` : ''}${spaceDown ? ` ${styles.spacePan}` : ''}`}
        onPointerDown={pointer.onViewportPointerDown}
        onPointerMove={pointer.onViewportPointerMove}
        onPointerUp={pointer.onViewportPointerUp}
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
          doc.addTable(r, c)
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

      {/* 便签拖拽幽灵：按住拖动时钉在光标下方的虚拟便签 */}
      <NoteDragGhost ghost={noteDrag.ghost} />
    </div>
  )
}

CanvasPage.propTypes = {
  taskId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}

/** 任务不存在时的占位页 */
function TaskNotFound() {
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
