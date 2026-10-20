/* ============================================================
   视口平移 —— 平移工具 / 空格临时平移
   ------------------------------------------------------------
   从 useViewportPointer 拆出的平移专属 hook：
   · down：记录起点与当前视口偏移
   · move：位移超过阈值标记 moved，实时更新视口偏移
   · up：没有实际移动视为点击空白 → 清空选中
   ============================================================ */

import { useRef, useState } from 'react'

/** 位移超过该值（屏幕 px）才算「拖拽过」，否则视为点击空白 */
const PAN_MOVE_THRESHOLD = 3

/**
 * @param {object} params
 * @param {{x:number, y:number, scale:number}} params.view 当前视口
 * @param {Function} params.setView        更新视口
 * @param {() => void} params.clearSelection 清空选中（点击空白）
 */
export function useViewportPan({ view, setView, clearSelection }) {
  const panRef = useRef(null)
  const [panning, setPanning] = useState(false)

  const beginPan = (e) => {
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

  const movePan = (e) => {
    const pan = panRef.current
    if (!pan) return
    if (Math.abs(e.clientX - pan.px) + Math.abs(e.clientY - pan.py) > PAN_MOVE_THRESHOLD) {
      pan.moved = true
    }
    setView((v) => ({ ...v, x: pan.vx + e.clientX - pan.px, y: pan.vy + e.clientY - pan.py }))
  }

  const endPan = (e) => {
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

  return { panning, beginPan, movePan, endPan }
}
