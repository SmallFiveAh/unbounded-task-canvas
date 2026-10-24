import { useMemo } from 'react'
import PropTypes from 'prop-types'
import { TASKS } from '../constants/tasks'
import { EMPTY_CANVAS, loadCanvas } from '../utils/canvasStore'
import CanvasPanels from './canvas/components/CanvasPanels'
import CanvasSaveHint from './canvas/components/CanvasSaveHint'
import CanvasSideToolbar from './canvas/components/CanvasSideToolbar'
import CanvasToolbar from './canvas/components/CanvasToolbar'
import CanvasViewport from './canvas/components/CanvasViewport'
import CanvasZoomBadge from './canvas/components/CanvasZoomBadge'
import { useCanvasDocument } from './canvas/hooks/useCanvasDocument'
import { useCanvasInteractions } from './canvas/hooks/useCanvasInteractions'
import { useCanvasKeyboard } from './canvas/hooks/useCanvasKeyboard'
import { useCanvasPersistence } from './canvas/hooks/useCanvasPersistence'
import { useCanvasSelection } from './canvas/hooks/useCanvasSelection'
import { useCanvasToolbar } from './canvas/hooks/useCanvasToolbar'
import { useCanvasViewport } from './canvas/hooks/useCanvasViewport'
import { useCommitNodeEdit } from './canvas/hooks/useCommitNodeEdit'
import { useNoteDragCreate } from './canvas/hooks/useNoteDragCreate'
import { previewEdgePath, resolveEdgePath } from './canvas/lib/edges'
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
 * - Ctrl/⌘ + 滚轮也可缩放；双击空白添加节点，节点可拖拽、双击编辑
 * - Delete 删除整个选区：框选多个元素（节点 + 表格）后一次全部删除
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
    onElementsRemoved: selection.removeElementsFromSelection,
  })

  // Delete 删除的是整个选区（selectedIds）：框选多个元素后一次删干净
  const { spaceDown } = useCanvasKeyboard({
    selectedIds: selection.selectedIds,
    removeElements: doc.removeElements,
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
    viewRef,
    addNode: doc.addNode,
    // 落库即进入编辑：新便签无需双击，创建后直接在左上角输入文案
    onNoteCreated: (id) => {
      selection.setDraft('')
      selection.setEditingId(id)
    },
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

  // 编辑草稿落库 + 点击画布（捕获阶段）的提交兜底（细节见 useCommitNodeEdit）
  const { commitNodeEdit, commitEditOnPointerDown } = useCommitNodeEdit({
    doc,
    selection,
    viewportRef,
  })

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
        tablePanelOpen={toolbar.tablePanelOpen}
        notePanelOpen={toolbar.notePanelOpen}
        mindPanelOpen={toolbar.mindPanelOpen}
        flowPanelOpen={toolbar.flowPanelOpen}
        listPanelOpen={toolbar.listPanelOpen}
        cardPanelOpen={toolbar.cardPanelOpen}
        tableBtnRef={toolbar.tableBtnRef}
        noteBtnRef={toolbar.noteBtnRef}
        mindBtnRef={toolbar.mindBtnRef}
        flowBtnRef={toolbar.flowBtnRef}
        listBtnRef={toolbar.listBtnRef}
        cardBtnRef={toolbar.cardBtnRef}
        toolbarRef={toolbar.sideToolbarRef}
        onToggleTablePanel={toolbar.toggleTablePanel}
        onToggleMindPanel={toolbar.toggleMindPanel}
        onToggleFlowPanel={toolbar.toggleFlowPanel}
        onToggleListPanel={toolbar.toggleListPanel}
        onToggleCardPanel={toolbar.toggleCardPanel}
        onNotePress={(e) => noteDrag.press(e, toolbar.noteStyleId, toolbar.toggleNotePanel)}
        onNoteClick={(e) => {
          // 指针点击已在 pointerup 阶段由 useNoteDragCreate 的 onClick 处理；
          // 这里只响应键盘激活的 click（detail === 0），否则会开→关双切换
          if (e.detail === 0) toolbar.toggleNotePanel()
        }}
      />
      <CanvasZoomBadge scale={view.scale} onReset={() => zoomByStep(1 / view.scale)} />

      {/* 无限画布视口：世界层 + 选中框层 + 空画布引导
          （pointercancel 也走 up 收口，避免缩放态挂死、便签贴死——见 useViewportPointer） */}
      <CanvasViewport
        viewportRef={viewportRef}
        tool={toolbar.tool}
        view={view}
        spaceDown={spaceDown}
        pointer={pointer}
        onPointerDownCapture={commitEditOnPointerDown}
        nodes={nodes}
        tables={tables}
        drag={drag}
        selection={selection}
        doc={doc}
        commitNodeEdit={commitNodeEdit}
        edgeViews={edgeViews}
        edgePreviewPath={edgePreviewPath}
        linkTargetRect={linkTargetRect}
        resize={resize}
        edgeDrag={edgeDrag}
      />

      {/* 全部插入 / 样式面板 + 便签拖拽幽灵（展示层，见 CanvasPanels） */}
      <CanvasPanels
        toolbar={toolbar}
        noteDrag={noteDrag}
        view={view}
        onInsertTable={doc.addTable}
      />
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
