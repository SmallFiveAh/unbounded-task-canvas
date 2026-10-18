/* ============================================================
   视口指针交互 —— 平移 / 框选 / 收口
   ------------------------------------------------------------
   视口是最外层的「不缩放」容器，三种拖拽都从这里发起或收尾：
   · 四角控制点缩放（优先级最高，由 SelectionFrame 发起）
   · 元素拖拽（节点 / 表格上的 move 会冒泡到这里）
   · 空白处拖拽：选择工具 → 框选；平移工具或按住空格 → 平移
   move / up 统一挂在视口，被拖的东西被移走也不会丢事件。
   ============================================================ */

import { useRef, useState } from 'react'
import { NODE_H, NODE_W } from '../lib/constants'
import { hitTestMarquee } from '../lib/geometry'

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
  dragRef,
  applyDragMove,
  endItemDrag,
  selectMany,
  clearSelection,
}) {
  const panRef = useRef(null)
  const marqueeRef = useRef(null)
  const [marquee, setMarquee] = useState(null) // { x1, y1, x2, y2 } 屏幕坐标
  const [panning, setPanning] = useState(false)

  const onViewportPointerDown = (e) => {
    // 仅响应主键在空白处的按下（节点会 stopPropagation）
    if (e.button !== 0) return

    // 空格键 + 选择工具：临时平移模式（拖拽空白平移）
    const spacePan = spaceDown && tool === 'select'

    // 选择工具（且未按空格）：开始框选
    if (tool === 'select' && !spacePan) {
      e.currentTarget.setPointerCapture(e.pointerId)
      marqueeRef.current = { x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY }
      setMarquee(marqueeRef.current)
      return
    }

    // 平移工具 / 空格临时平移：拖拽空白平移
    panRef.current = {
      px: e.clientX,
      py: e.clientY,
      vx: view.x,
      vy: view.y,
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    setPanning(true)
  }

  const onViewportPointerMove = (e) => {
    // 四角控制点缩放中（优先级最高）
    if (resizingRef.current) {
      applyResize(e)
      return
    }

    // 元素拖拽中：由视口兜底驱动（节点/表格上的移动事件会冒泡到这里）
    if (dragRef.current) {
      applyDragMove(e)
      return
    }

    // 框选中
    const mq = marqueeRef.current
    if (mq) {
      marqueeRef.current = { ...mq, x2: e.clientX, y2: e.clientY }
      setMarquee(marqueeRef.current)
      return
    }

    // 平移中
    const pan = panRef.current
    if (!pan) return
    if (Math.abs(e.clientX - pan.px) + Math.abs(e.clientY - pan.py) > 3) {
      pan.moved = true
    }
    setView((v) => ({ ...v, x: pan.vx + e.clientX - pan.px, y: pan.vy + e.clientY - pan.py }))
  }

  const onViewportPointerUp = (e) => {
    // 四角控制点缩放释放
    if (resizingRef.current) {
      endResize(e)
      return
    }

    // 元素拖拽释放
    if (dragRef.current) {
      endItemDrag(e)
      return
    }

    // 框选释放
    const mq = marqueeRef.current
    if (mq) {
      marqueeRef.current = null
      setMarquee(null)
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      // 仅当框选有实际范围时才判定选中，否则视为点击空白取消选中
      const x1 = Math.min(mq.x1, mq.x2)
      const x2 = Math.max(mq.x1, mq.x2)
      const y1 = Math.min(mq.y1, mq.y2)
      const y2 = Math.max(mq.y1, mq.y2)
      if (x2 - x1 > 2 && y2 - y1 > 2) {
        // 框选：将屏幕矩形换算为世界坐标，命中节点与表格
        const rect = e.currentTarget.getBoundingClientRect()
        selectMany(
          hitTestMarquee(
            {
              x1: (x1 - rect.left - view.x) / view.scale,
              y1: (y1 - rect.top - view.y) / view.scale,
              x2: (x2 - rect.left - view.x) / view.scale,
              y2: (y2 - rect.top - view.y) / view.scale,
            },
            nodes,
            tables,
          ),
        )
      } else {
        // 点击空白：取消选中
        clearSelection()
      }
      return
    }

    // 平移释放
    const pan = panRef.current
    panRef.current = null
    setPanning(false)
    if (pan && !pan.moved) {
      // 点击空白：取消选中
      clearSelection()
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const onViewportDoubleClick = (e) => {
    const world = screenToWorld(e.clientX, e.clientY)
    addNode(world.x - NODE_W / 2, world.y - NODE_H / 2)
  }

  return {
    marquee,
    panning,
    onViewportPointerDown,
    onViewportPointerMove,
    onViewportPointerUp,
    onViewportDoubleClick,
  }
}
