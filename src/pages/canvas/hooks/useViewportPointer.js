/* ============================================================
   视口指针交互 —— 分发层
   ------------------------------------------------------------
   视口是最外层的「不缩放」容器，所有拖拽都从这里发起或收尾。
   具体行为拆在两个子 hook 里：
   · useViewportMarquee  选择工具的框选
   · useViewportPan      平移工具 / 空格临时平移
   其余三种拖拽（控制点缩放 / 边框拉线 / 元素拖拽）由各自的
   hook 持有状态，这里只按优先级分发 move / up：

   缩放 > 拉线 > 元素拖拽 > 框选 / 平移

   move / up 统一挂在视口，被拖的东西被移走也不会丢事件。
   ============================================================ */

import { NODE_H, NODE_W } from '../lib/constants'
import { useViewportMarquee } from './useViewportMarquee'
import { useViewportPan } from './useViewportPan'

export function useViewportPointer({
  view,
  setView,
  nodes,
  tables,
  tool,
  spaceDown,
  screenToWorld,
  addNode,
  resizingRef,
  applyResize,
  endResize,
  edgeDragRef,
  applyEdgeDrag,
  endEdgeDrag,
  dragRef,
  applyDragMove,
  endItemDrag,
  selectMany,
  clearSelection,
}) {
  const marquee = useViewportMarquee({ view, nodes, tables, selectMany, clearSelection })
  const pan = useViewportPan({ view, setView, clearSelection })

  // 选择工具（且未按空格）：框选；否则走平移
  const isMarqueeMode = tool === 'select' && !spaceDown

  const onViewportPointerDown = (e) => {
    // 仅响应主键在空白处的按下（节点会 stopPropagation）
    if (e.button !== 0) return
    if (isMarqueeMode) {
      marquee.beginMarquee(e)
      return
    }
    // 平移工具 / 空格临时平移：拖拽空白平移
    pan.beginPan(e)
  }

  const onViewportPointerMove = (e) => {
    // 四角控制点缩放中（优先级最高）
    if (resizingRef.current) return applyResize(e)

    // 边框拉线中（优先级仅低于缩放）
    if (edgeDragRef.current) return applyEdgeDrag(e)

    // 元素拖拽中：由视口兜底驱动（节点/表格上的移动事件会冒泡到这里）
    if (dragRef.current) return applyDragMove(e)

    // 框选中
    if (marquee.marqueeRef.current) return marquee.moveMarquee(e)

    // 平移中（无拖拽状态时 movePan 内部直接忽略）
    pan.movePan(e)
  }

  const onViewportPointerUp = (e) => {
    // 四角控制点缩放释放
    if (resizingRef.current) return endResize(e)

    // 边框拉线释放：落在其它元素上则落库连线
    if (edgeDragRef.current) return endEdgeDrag(e)

    // 元素拖拽释放
    if (dragRef.current) return endItemDrag(e)

    // 框选释放 / 平移释放
    if (marquee.marqueeRef.current) return marquee.endMarquee(e)
    pan.endPan(e)
  }

  const onViewportDoubleClick = (e) => {
    const world = screenToWorld(e.clientX, e.clientY)
    addNode(world.x - NODE_W / 2, world.y - NODE_H / 2)
  }

  return {
    marquee: marquee.marquee,
    panning: pan.panning,
    onViewportPointerDown,
    onViewportPointerMove,
    onViewportPointerUp,
    onViewportDoubleClick,
  }
}
