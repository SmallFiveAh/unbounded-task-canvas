/* ============================================================
   画布几何 —— 纯函数
   ------------------------------------------------------------
   屏幕 ↔ 世界坐标换算、缩放夹取、框选命中判定。
   不依赖 React、不读写任何状态：相同输入永远得到相同输出，
   因此可以被事件处理器、渲染、测试以任意顺序调用。
   ============================================================ */

import { getTableSize } from '../../../constants/canvasTable'
import { MAX_SCALE, MIN_SCALE } from '../../../utils/canvasStore'

/** 缩放比例夹到画布允许的上下限（与本地存档校验共用同一套值） */
export const clampScale = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))

/** 数值夹取 */
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/** 框选矩形的最小有效边长（屏幕 px）：低于它视为点击空白而非框选 */
export const MARQUEE_MIN_SIZE = 2

/**
 * 屏幕框选矩形 → 世界坐标矩形（端点归一化）。
 * 框选没有实际范围（任一边 ≤ MARQUEE_MIN_SIZE）时返回 null，
 * 调用方应视为「点击空白」。
 * @param {{x1:number, y1:number, x2:number, y2:number}} mq 屏幕坐标框选矩形
 * @param {{left:number, top:number}} bounds 视口在屏幕中的包围盒
 * @param {{x:number, y:number, scale:number}} view 当前视口
 */
export function marqueeToWorldRect(mq, bounds, view) {
  const x1 = Math.min(mq.x1, mq.x2)
  const x2 = Math.max(mq.x1, mq.x2)
  const y1 = Math.min(mq.y1, mq.y2)
  const y2 = Math.max(mq.y1, mq.y2)
  if (x2 - x1 <= MARQUEE_MIN_SIZE || y2 - y1 <= MARQUEE_MIN_SIZE) return null

  return {
    x1: (x1 - bounds.left - view.x) / view.scale,
    y1: (y1 - bounds.top - view.y) / view.scale,
    x2: (x2 - bounds.left - view.x) / view.scale,
    y2: (y2 - bounds.top - view.y) / view.scale,
  }
}

/**
 * 屏幕坐标 → 世界坐标
 * @param {{x:number, y:number, scale:number}} view  当前视口（平移偏移 + 缩放）
 * @param {{left:number, top:number}} bounds        视口在屏幕中的包围盒（getBoundingClientRect）
 * @param {number} clientX
 * @param {number} clientY
 */
export function screenToWorld(view, bounds, clientX, clientY) {
  return {
    x: (clientX - bounds.left - view.x) / view.scale,
    y: (clientY - bounds.top - view.y) / view.scale,
  }
}

/**
 * 框选命中：与世界坐标矩形相交的节点 / 表格 id
 * 节点在前、表格在后 —— 与「先点节点后点表格」的选中顺序保持一致。
 * @param {{x1:number, y1:number, x2:number, y2:number}} rect 世界坐标矩形
 */
export function hitTestMarquee(rect, nodes, tables) {
  const { x1, y1, x2, y2 } = rect
  const hitNodes = nodes
    .filter(
      (n) => n.x + n.w >= x1 && n.x <= x2 && n.y + n.h >= y1 && n.y <= y2,
    )
    .map((n) => n.id)
  const hitTables = tables
    .filter((t) => {
      const { w, h } = getTableSize(t)
      return t.x + w >= x1 && t.x <= x2 && t.y + h >= y1 && t.y <= y2
    })
    .map((t) => t.id)
  return [...hitNodes, ...hitTables]
}
