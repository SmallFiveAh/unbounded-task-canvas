/* ============================================================
   画布指针交互 —— 编排层
   ------------------------------------------------------------
   把四个互相衔接的指针 hook 组装在一起：
   · useItemDrag        元素拖拽（节点 + 表格）
   · useSelectionResize 四角控制点缩放
   · useEdgeDrag        选中框四边拉线（连线状态机）
   · useViewportPointer 视口收口：平移 / 框选 / 分发上面三者
   收口约定：move / up 统一挂在视口上，优先级为
   缩放 > 拉线 > 元素拖拽 > 框选 / 平移。
   ============================================================ */

import { useEdgeDrag } from './useEdgeDrag'
import { useItemDrag } from './useItemDrag'
import { useSelectionResize } from './useSelectionResize'
import { useViewportPointer } from './useViewportPointer'

/**
 * @param {object} params
 * @param {object} params.doc        useCanvasDocument 的返回（nodes/tables/setNodes…）
 * @param {object} params.selection  useCanvasSelection 的返回
 * @param {object} params.view       当前视口 { x, y, scale }
 * @param {Function} params.setView
 * @param {string} params.tool       当前工具（select / pan）
 * @param {boolean} params.spaceDown 空格键按住（临时平移）
 * @param {import('react').MutableRefObject} params.viewportRef
 * @param {Function} params.screenToWorld 屏幕坐标 → 世界坐标
 * @param {Function} params.addNode  双击空白添加节点
 * @param {Array} params.visibleNodes 可见节点（收起隐藏的导图后代已剔除）：
 *   连线命中 / 框选都只在可见元素上进行
 */
export function useCanvasInteractions({
  doc,
  selection,
  view,
  setView,
  tool,
  spaceDown,
  viewportRef,
  screenToWorld,
  addNode,
  visibleNodes,
}) {
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
    nodes: visibleNodes ?? doc.nodes,
    tables: doc.tables,
    viewportRef,
    screenToWorld,
    addEdge: doc.addEdge,
  })

  const pointer = useViewportPointer({
    view,
    setView,
    nodes: visibleNodes ?? doc.nodes,
    tables: doc.tables,
    tool,
    spaceDown,
    screenToWorld,
    addNode,
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

  return { drag, resize, edgeDrag, pointer }
}
