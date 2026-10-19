/* ============================================================
   连线几何 —— 纯函数
   ------------------------------------------------------------
   连线的两个端点不是「元素中心」，而是带锚点（anchor）的相对位置：
   anchor = { rx, ry } ∈ [0,1]²，表示端点落在元素矩形的哪个相对位置 ——
   鼠标在边框的哪个位置拉出线，端点就钉在哪个位置；元素移动 / 缩放后，
   端点仍贴在同一相对位置，不会漂移。
   曲线用三次贝塞尔：控制点沿端点朝元素外侧的法线方向外扩，
   弯曲程度随两端距离自适应。
   终点裁剪到目标元素的边框（见 trimCubicToRect）：箭头尖端停在边框上，
   而不是钻进节点内部被盖住。不依赖 React、不读写任何状态。
   ============================================================ */

import { getTableSize } from '../../../constants/canvasTable'
import {
  EDGE_CURVE_MAX,
  EDGE_CURVE_MIN,
  EDGE_CURVE_RATIO,
  EDGE_TARGET_PAD,
  NODE_RADIUS,
} from './constants'
import { clamp } from './geometry'

const CENTER_ANCHOR = { rx: 0.5, ry: 0.5 }
const TABLE_RADIUS = 5 // 与选中框层里表格的 baseRadius 一致

/* 边框裁剪精度：粗采样定位首次触及边框的参数区间，再二分细化到亚像素 */
const TRIM_SAMPLES = 48
const TRIM_REFINE_STEPS = 6

/**
 * 节点 + 表格统一索引成「可连线元素」：id → 世界坐标矩形。
 * 表格的 w/h 由行列推导（见 canvasTable.js），连线层因此不关心元素类型。
 */
export function buildElementIndex(nodes, tables) {
  const index = new Map()
  for (const n of nodes) {
    index.set(n.id, { id: n.id, kind: 'node', x: n.x, y: n.y, w: n.w, h: n.h, baseRadius: NODE_RADIUS })
  }
  for (const t of tables) {
    const { w, h } = getTableSize(t)
    index.set(t.id, { id: t.id, kind: 'table', x: t.x, y: t.y, w, h, baseRadius: TABLE_RADIUS })
  }
  return index
}

/**
 * 世界坐标点命中的最上层元素 id（数组靠后的元素渲染在上层，倒序命中）。
 * excludeId 用于跳过连线源元素 —— 连线不允许连自己。
 */
export function hitTestElement(point, index, excludeId) {
  const els = [...index.values()]
  for (let i = els.length - 1; i >= 0; i--) {
    const el = els[i]
    if (el.id === excludeId) continue
    const inside =
      point.x >= el.x && point.x <= el.x + el.w && point.y >= el.y && point.y <= el.y + el.h
    if (inside) return el.id
  }
  return null
}

/** 世界坐标点 → 元素矩形内的相对锚点（夹到 [0,1]，端点不会漂到元素外） */
export function relativeAnchor(rect, point) {
  return {
    rx: clamp((point.x - rect.x) / rect.w, 0, 1),
    ry: clamp((point.y - rect.y) / rect.h, 0, 1),
  }
}

/** 锚点 → 世界坐标端点 */
export function anchorPoint(rect, anchor) {
  return { x: rect.x + anchor.rx * rect.w, y: rect.y + anchor.ry * rect.h }
}

/** 锚点处朝元素外侧的单位法线：取相对位置中占优的方向（上下左右四选一） */
export function anchorNormal(anchor) {
  const dx = anchor.rx - 0.5
  const dy = anchor.ry - 0.5
  if (Math.abs(dx) >= Math.abs(dy)) return { x: dx >= 0 ? 1 : -1, y: 0 }
  return { x: 0, y: dy >= 0 ? 1 : -1 }
}

/** 两点连线方向的单位向量（距离过近时默认朝右，避免零向量） */
function directionNormal(from, to) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  if (len < 0.001) return { x: 1, y: 0 }
  return { x: dx / len, y: dy / len }
}

/* ---------- 三次贝塞尔：构建 / 求值 / 分割 / 裁剪 ---------- */

const lerpPoint = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

/** 按两端法线构建三次贝塞尔段：控制点外扩长度随端点距离自适应 */
function buildCubic(p1, n1, p2, n2) {
  const k = clamp(
    Math.hypot(p2.x - p1.x, p2.y - p1.y) * EDGE_CURVE_RATIO,
    EDGE_CURVE_MIN,
    EDGE_CURVE_MAX,
  )
  return {
    p1,
    c1: { x: p1.x + n1.x * k, y: p1.y + n1.y * k },
    c2: { x: p2.x + n2.x * k, y: p2.y + n2.y * k },
    p2,
  }
}

/** 曲线在 t ∈ [0,1] 处的点 */
function cubicPoint(seg, t) {
  const u = 1 - t
  const w1 = u * u * u
  const w2 = 3 * u * u * t
  const w3 = 3 * u * t * t
  const w4 = t * t * t
  return {
    x: w1 * seg.p1.x + w2 * seg.c1.x + w3 * seg.c2.x + w4 * seg.p2.x,
    y: w1 * seg.p1.y + w2 * seg.c1.y + w3 * seg.c2.y + w4 * seg.p2.y,
  }
}

/** De Casteljau 分割：把一段贝塞尔在 t 处切成前后两段 */
function splitCubic(seg, t) {
  const ab = lerpPoint(seg.p1, seg.c1, t)
  const bc = lerpPoint(seg.c1, seg.c2, t)
  const cd = lerpPoint(seg.c2, seg.p2, t)
  const abc = lerpPoint(ab, bc, t)
  const bcd = lerpPoint(bc, cd, t)
  const mid = lerpPoint(abc, bcd, t)
  return [
    { p1: seg.p1, c1: ab, c2: abc, p2: mid },
    { p1: mid, c1: bcd, c2: cd, p2: seg.p2 },
  ]
}

/**
 * 把贝塞尔曲线裁剪到目标矩形：返回矩形外侧的可见段。
 * 曲线首次触及「外扩 pad 像素的矩形」即收笔 —— 箭头尖端正好悬在边框上，
 * 不会穿进节点内部被盖住。起点已在矩形内（元素重叠）时原样返回。
 */
function trimCubicToRect(seg, rect, pad) {
  const x1 = rect.x - pad
  const y1 = rect.y - pad
  const x2 = rect.x + rect.w + pad
  const y2 = rect.y + rect.h + pad
  const inside = (p) => p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2

  if (inside(seg.p1)) return seg

  let prevT = 0
  for (let i = 1; i <= TRIM_SAMPLES; i++) {
    const t = i / TRIM_SAMPLES
    if (!inside(cubicPoint(seg, t))) {
      prevT = t
      continue
    }
    // 二分逼近首次触及边框的位置，取前段 —— 曲线恰好停在边框处
    let lo = prevT
    let hi = t
    for (let k = 0; k < TRIM_REFINE_STEPS; k++) {
      const mid = (lo + hi) / 2
      if (inside(cubicPoint(seg, mid))) hi = mid
      else lo = mid
    }
    return splitCubic(seg, hi)[0]
  }
  return seg
}

const cubicToPath = (seg) =>
  `M ${seg.p1.x} ${seg.p1.y} C ${seg.c1.x} ${seg.c1.y}, ${seg.c2.x} ${seg.c2.y}, ${seg.p2.x} ${seg.p2.y}`

/**
 * 已落库连线 → SVG 路径（终点裁剪到目标边框）。
 * 老数据没有锚点（种子连线）：端点取元素中心，法线取两端连线方向。
 */
export function resolveEdgePath(edge, index) {
  const from = index.get(edge.from)
  const to = index.get(edge.to)
  if (!from || !to) return null
  const p1 = anchorPoint(from, edge.fromAnchor ?? CENTER_ANCHOR)
  const p2 = anchorPoint(to, edge.toAnchor ?? CENTER_ANCHOR)
  const n1 = edge.fromAnchor ? anchorNormal(edge.fromAnchor) : directionNormal(p1, p2)
  const n2 = edge.toAnchor ? anchorNormal(edge.toAnchor) : directionNormal(p2, p1)
  return cubicToPath(trimCubicToRect(buildCubic(p1, n1, p2, n2), to, EDGE_TARGET_PAD))
}

/**
 * 拖拽中的预览连线 → SVG 路径（悬停目标时同样裁剪到其边框）。
 * @param {{fromId:string, fromAnchor:{rx:number, ry:number}, to:{x:number, y:number}, targetId:?string}} drag
 *   to 为指针当前世界坐标。指针悬在目标元素上时，终点吸附为相对锚点并裁剪到
 *   边框（与松手落库后的可见效果一致）；否则终点就是指针本身，法线回指源元素。
 */
export function previewEdgePath(drag, index) {
  const from = index.get(drag.fromId)
  if (!from) return null
  const p1 = anchorPoint(from, drag.fromAnchor)
  const n1 = anchorNormal(drag.fromAnchor)

  const target = drag.targetId ? index.get(drag.targetId) : null
  if (target) {
    const toAnchor = relativeAnchor(target, drag.to)
    const seg = buildCubic(p1, n1, anchorPoint(target, toAnchor), anchorNormal(toAnchor))
    return cubicToPath(trimCubicToRect(seg, target, EDGE_TARGET_PAD))
  }
  return cubicToPath(buildCubic(p1, n1, drag.to, directionNormal(drag.to, p1)))
}
