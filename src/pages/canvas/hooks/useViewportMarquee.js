/* ============================================================
   视口框选 —— 选择工具在空白处拖出的矩形选区
   ------------------------------------------------------------
   从 useViewportPointer 拆出的框选专属 hook：
   · down：记录起点并捕获指针（捕获在视口上，收口由视口统一负责）
   · move：更新矩形终点
   · up：矩形换算为世界坐标，命中节点与表格 → 多选；无实际范围 → 清空选中
   ============================================================ */

import { useRef, useState } from 'react'
import { hitTestMarquee, marqueeToWorldRect } from '../lib/geometry'

/**
 * @param {object} params
 * @param {{x:number, y:number, scale:number}} params.view 当前视口
 * @param {Array<object>} params.nodes   画布节点
 * @param {Array<object>} params.tables  画布表格
 * @param {(ids: string[]) => void} params.selectMany     批量选中
 * @param {() => void} params.clearSelection              清空选中（点击空白）
 */
export function useViewportMarquee({ view, nodes, tables, selectMany, clearSelection }) {
  const marqueeRef = useRef(null)
  // { x1, y1, x2, y2 } 屏幕坐标
  const [marquee, setMarquee] = useState(null)

  const beginMarquee = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    marqueeRef.current = { x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY }
    setMarquee(marqueeRef.current)
  }

  const moveMarquee = (e) => {
    marqueeRef.current = { ...marqueeRef.current, x2: e.clientX, y2: e.clientY }
    setMarquee(marqueeRef.current)
  }

  const endMarquee = (e) => {
    const mq = marqueeRef.current
    marqueeRef.current = null
    setMarquee(null)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }

    // 仅当框选有实际范围时才判定选中，否则视为点击空白取消选中
    const rect = e.currentTarget.getBoundingClientRect()
    const worldRect = mq ? marqueeToWorldRect(mq, rect, view) : null
    if (worldRect) {
      // 框选：将屏幕矩形换算为世界坐标，命中节点与表格
      selectMany(hitTestMarquee(worldRect, nodes, tables))
    } else {
      clearSelection()
    }
  }

  return { marquee, marqueeRef, beginMarquee, moveMarquee, endMarquee }
}
