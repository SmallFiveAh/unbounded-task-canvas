/* ============================================================
   缩略图布局 —— 纯函数
   ------------------------------------------------------------
   内容包围盒 → 正方形 viewBox（与缩略图区域比例一致，完整显示且不裁切）。
   不依赖 React、不读写状态。
   ============================================================ */

import { getTableSize } from '../../constants/canvasTable'

/** 内容到 viewBox 边缘的留白（世界坐标） */
export const THUMB_PADDING = 56

/** viewBox 最小边长：空内容附近不至于把元素放到无限大 */
const MIN_SIDE = 260

/**
 * 计算缩略图 viewBox（正方形，居中）
 * @param {Array<{x:number, y:number, w:number, h:number}>} nodes
 * @param {Array<object>} tables 画布表格（尺寸由 getTableSize 推导）
 * @returns {{vx:number, vy:number, side:number}}
 */
export function computeLayout(nodes, tables) {
  const rects = [
    ...nodes.map((n) => ({ x: n.x, y: n.y, w: n.w, h: n.h })),
    ...tables.map((t) => {
      const { w, h } = getTableSize(t)
      return { x: t.x, y: t.y, w, h }
    }),
  ]

  const minX = Math.min(...rects.map((r) => r.x)) - THUMB_PADDING
  const minY = Math.min(...rects.map((r) => r.y)) - THUMB_PADDING
  const maxX = Math.max(...rects.map((r) => r.x + r.w)) + THUMB_PADDING
  const maxY = Math.max(...rects.map((r) => r.y + r.h)) + THUMB_PADDING
  const side = Math.max(maxX - minX, maxY - minY, MIN_SIDE)

  return {
    vx: (minX + maxX) / 2 - side / 2,
    vy: (minY + maxY) / 2 - side / 2,
    side,
  }
}
