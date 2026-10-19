import { useMemo } from 'react'
import CanvasTable from '../components/CanvasTable/CanvasTable'
import InsertTablePanel from '../components/InsertTablePanel/InsertTablePanel'
import { CATEGORIES, TASKS } from '../constants/tasks'
import { EMPTY_CANVAS, loadCanvas } from '../utils/canvasStore'
import CanvasNodeLayer from './canvas/components/CanvasNodeLayer'
import CanvasSaveHint from './canvas/components/CanvasSaveHint'
import CanvasSelectionLayer from './canvas/components/CanvasSelectionLayer'
import CanvasSideToolbar from './canvas/components/CanvasSideToolbar'
import CanvasToolbar from './canvas/components/CanvasToolbar'
import CanvasZoomBadge from './canvas/components/CanvasZoomBadge'
import { useCanvasDocument } from './canvas/hooks/useCanvasDocument'
import { useCanvasKeyboard } from './canvas/hooks/useCanvasKeyboard'
import { useCanvasPersistence } from './canvas/hooks/useCanvasPersistence'
import { useCanvasSelection } from './canvas/hooks/useCanvasSelection'
import { useCanvasToolbar } from './canvas/hooks/useCanvasToolbar'
import { useCanvasViewport } from './canvas/hooks/useCanvasViewport'
import { useEdgeDrag } from './canvas/hooks/useEdgeDrag'
import { useItemDrag } from './canvas/hooks/useItemDrag'
import { useSelectionResize } from './canvas/hooks/useSelectionResize'
import { useViewportPointer } from './canvas/hooks/useViewportPointer'
import { GRID_FINE, GRID_MAJOR } from './canvas/lib/constants'
import { previewEdgePath, resolveEdgePath } from './canvas/lib/edges'
import styles from './CanvasPage.module.css'

/**
 * 无限画布页面（编排层）
 * ------------------------------------------------------------
 * 这里只做三件事：解析任务、把各功能 hook 串起来、摆出页面骨架。
 * 周边的模块按职责分三类，都在 ./canvas/ 下：
 *
 * canvas/hooks/ —— 行为（每个文件一个关注点）
 * - useCanvasViewport     视图（平移 + 缩放）与滚轮
 * - useCanvasToolbar      工具栏 / 插入面板的 UI 状态
 * - useCanvasDocument     节点 / 连线 / 表格数据与增删改
 * - useCanvasSelection    选中态与节点编辑态
 * - useItemDrag           节点 + 表格拖拽
 * - useEdgeDrag           选中框四边拉线（连线拖拽状态机）
 * - useSelectionResize    选中框几何 + 四角控制点缩放
 * - useViewportPointer    视口指针：平移 / 框选 / 收口
 * - useCanvasKeyboard     Delete / Esc / 空格
 * - useCanvasPersistence  归档到 localStorage + 「已保存」提示
 *
 * canvas/components/ —— 展示（一个组件一个目录：jsx + module.css + index.js）
 * - CanvasToolbar / CanvasSideToolbar          顶部与左侧工具栏
 * - CanvasNodeLayer / CanvasSelectionLayer     连线与节点、选中框与框选矩形
 * - CanvasSaveHint / CanvasZoomBadge           右上角保存提示、右下角缩放徽标
 *
 * canvas/lib/ —— 纯函数与常量（不依赖 React）
 * - constants.js  网格 / 节点尺寸 / 贝塞尔弯曲度等设计值
 * - geometry.js   坐标换算、缩放夹取、框选命中
 * - edges.js      连线锚点、贝塞尔路径、拉线命中
 *
 * 行为约定（与拆分前一致）：
 * - 拖拽空白处平移，滚轮平移；激活「鼠标滚轮」按钮后滚轮缩放（每次 5%，光标为中心）
 * - Ctrl/⌘ + 滚轮也可缩放
 * - 双击空白添加节点，节点可拖拽、双击编辑、Delete 删除
 * - 元素默认无边框；选中后出现 1px 橙色选中框 + 四角控制点，拖动控制点缩放
 * - 鼠标悬到选中框四边：光标变十字线，按下拖出连线（贝塞尔曲线 + 实心箭头），
 *   松手落在哪个元素上就连到哪个元素，落在空白则取消；连线数量不限
 * - 内容（节点/连线/表格）与视图（缩放比例 + 平移）都持久化到 localStorage，
 *   下次打开原样回到上次的视角；任务列表缩略图实时同步结构
 */
export default function CanvasPage({ taskId }) {
  const task = TASKS.find((t) => String(t.id) === String(taskId))

  // 首次进入：优先读取本地存档，没有存档才用常量数据生成初始画布
  const initial = useMemo(
    () => (task ? loadCanvas(task) : EMPTY_CANVAS),
    [task],
  )

  /* ---------- 工具栏 / 插入面板状态 ---------- */

  const {
    tool,
    sideTool,
    wheelZoom,
    tablePanelOpen,
    tableRows,
    tableCols,
    tableBtnRef,
    sideToolbarRef,
    selectTool,
    togglePan,
    toggleWheelZoom,
    toggleSideTool,
    toggleTablePanel,
    closeTablePanel,
    setTableSize,
  } = useCanvasToolbar()

  /* ---------- 功能模块 ---------- */

  const {
    viewportRef,
    view,
    setView,
    viewRef,
    initialView,
    zoomByStep,
    screenToWorld,
  } = useCanvasViewport({ initial, wheelZoom })

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

  const drag = useItemDrag({
    nodes: doc.nodes,
    tables: doc.tables,
    setNodes: doc.setNodes,
    setTables: doc.setTables,
    setSelectedId: selection.setSelectedId,
    selectedIds: selection.selectedIds,
    setSelectedIds: selection.setSelectedIds,
    editingId: selection.editingId,
    view,
  })

  const resize = useSelectionResize({
    selectedIds: selection.selectedIds,
    selectedId: selection.selectedId,
    nodes: doc.nodes,
    tables: doc.tables,
    setNodes: doc.setNodes,
    setTables: doc.setTables,
    view,
    viewportRef,
  })

  const edgeDrag = useEdgeDrag({
    nodes: doc.nodes,
    tables: doc.tables,
    viewportRef,
    screenToWorld,
    addEdge: doc.addEdge,
  })

  const pointer = useViewportPointer({
    view,
    setView,
    nodes: doc.nodes,
    tables: doc.tables,
    tool,
    spaceDown,
    screenToWorld,
    addNode: doc.addNode,
    resizingRef: resize.resizeRef,
    applyResize: resize.applyResize,
    endResize: resize.endResize,
    edgeDragRef: edgeDrag.dragRef,
    applyEdgeDrag: edgeDrag.applyEdgeDrag,
    endEdgeDrag: edgeDrag.endEdgeDrag,
    dragRef: drag.dragRef,
    applyDragMove: drag.applyDragMove,
    endItemDrag: drag.endItemDrag,
    selectMany: selection.selectMany,
    clearSelection: selection.clearSelection,
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

  // 节点文案落库：空白内容视为「不改」，只退出编辑态
  const commitNodeEdit = () => {
    doc.commitNodeText(selection.editingId, selection.draft)
    selection.stopEditing()
  }

  /* ---------- 渲染 ---------- */

  const { nodes, edges, tables } = doc

  /* ---------- 连线路径（贝塞尔） ---------- */

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

  if (!task) {
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

  // 原有变量，当前页面未使用（保持拆分前原样）
  const categoryLabel = CATEGORIES.find((c) => c.key === task.category)?.label

  // 高倍率下细网格跟着细分，避免 500% 时格距过大、画面发大块
  const gridSub = view.scale >= 4 ? 4 : view.scale >= 2 ? 2 : 1
  const fine = (GRID_FINE / gridSub) * view.scale
  const major = GRID_MAJOR * view.scale
  // 缩放过小时隐藏细网格，避免密集摩尔纹
  const fineColor = view.scale < 0.5 ? 'transparent' : 'var(--color-wash)'
  const gridPos = `${view.x}px ${view.y}px`

  return (
    <div className={styles.canvasPage}>
      {/* 右上角：本地保存提示（仅在数据发生变化时出现，5 秒后淡出） */}
      <CanvasSaveHint hintRef={savedHintRef} />

      {/* 顶部中间工具栏：选择 + 缩放 */}
      <CanvasToolbar
        tool={tool}
        wheelZoom={wheelZoom}
        onSelectTool={selectTool}
        onTogglePan={togglePan}
        onToggleWheelZoom={toggleWheelZoom}
      />

      {/* 左侧中间工具栏：便签 / 表格 / 思维导图 / 流程图 / 卡片 / 列表卡片 */}
      <CanvasSideToolbar
        sideTool={sideTool}
        tablePanelOpen={tablePanelOpen}
        tableBtnRef={tableBtnRef}
        toolbarRef={sideToolbarRef}
        onToggleSideTool={toggleSideTool}
        onToggleTablePanel={toggleTablePanel}
      />

      {/* 右下角浮层：缩放百分比 */}
      <CanvasZoomBadge
        scale={view.scale}
        onReset={() => zoomByStep(1 / view.scale)}
      />

      {/* 无限画布视口 */}
      <div
        ref={viewportRef}
        data-canvas-viewport
        data-tool={tool}
        className={`${styles.viewport}${pointer.panning ? ` ${styles.panning}` : ''}${spaceDown ? ` ${styles.spacePan}` : ''}`}
        onPointerDown={pointer.onViewportPointerDown}
        onPointerMove={pointer.onViewportPointerMove}
        onPointerUp={pointer.onViewportPointerUp}
        onDoubleClick={pointer.onViewportDoubleClick}
        style={{
          backgroundImage: `radial-gradient(circle, ${fineColor} 1px, transparent 1px),
            radial-gradient(circle, var(--color-border) 2px, transparent 2px)`,
          backgroundSize: `${fine}px ${fine}px, ${major}px ${major}px`,
          backgroundPosition: `${gridPos}, ${gridPos}`,
        }}
      >
        {/* 世界层：平移 + 缩放 */}
        <div
          className={styles.world}
          style={{
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
          }}
        >
          {/* 连线层 + 节点层 */}
          <CanvasNodeLayer
            nodes={nodes}
            edgeViews={edgeViews}
            previewPath={edgePreviewPath}
            selectedIds={selection.selectedIds}
            selectedId={selection.selectedId}
            editingId={selection.editingId}
            draft={selection.draft}
            scale={view.scale}
            onNodePointerDown={drag.onNodePointerDown}
            onNodePointerMove={drag.onNodePointerMove}
            onNodePointerUp={drag.onNodePointerUp}
            onStartEdit={selection.startEditNode}
            onDraftChange={selection.setDraft}
            onCommitEdit={commitNodeEdit}
            onCancelEdit={selection.stopEditing}
          />

          {/* 表格层（Excel 风格） */}
          {tables.map((table) => (
            <CanvasTable
              key={table.id}
              table={table}
              selected={table.id === selection.selectedId || selection.selectedIds.includes(table.id)}
              primary={table.id === selection.selectedId}
              onPointerDown={drag.onTablePointerDown}
              onPointerMove={drag.onTablePointerMove}
              onPointerUp={drag.onTablePointerUp}
              onActivate={selection.selectOnly}
              onCellChange={doc.updateTableCell}
              onClearCells={doc.clearTableCells}
              onPasteCells={doc.pasteTableCells}
              scale={view.scale}
            />
          ))}
        </div>

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
        open={tablePanelOpen}
        rows={tableRows}
        cols={tableCols}
        anchorRef={tableBtnRef}
        toolbarRef={sideToolbarRef}
        onClose={closeTablePanel}
        onConfirm={(r, c) => {
          // 在画布中央插入所选行列的表格
          doc.addTable(r, c)
          closeTablePanel()
        }}
        onChange={setTableSize}
      />
    </div>
  )
}
