/* ============================================================
   控制点缩放的纯几何计算（不依赖 React）
   ------------------------------------------------------------
   · 按「对边固定」重算矩形，拖过最小尺寸时不会翻面
   · 节点改 w/h；表格改单元格尺寸（字不会被拉扁，语义上是拉宽列、拉高行）

   节点的高度是「内容撑开」的，因此不能直接写 h：
   · 拖控制点写的是 minH（用户下限），h 由 max(minH, contentH) 推出
   · 反推左上角时用的必须是这个「生效高度」而不是指针位移量，
     否则内容比下限高时，盒子会一边缩一边把固定边推着走 —— 就是漂移
   ============================================================ */

import {
  TABLE_MAX_CELL_H,
  TABLE_MAX_CELL_W,
  TABLE_MIN_CELL_H,
  TABLE_MIN_CELL_W,
  TABLE_ROW_HEADER_W,
  sizesTotal,
  tableColWidths,
  tableHeaderH,
  tableRowHeights,
} from '../../../constants/canvasTable'
import { NODE_MIN_H, NODE_MIN_W } from './constants'
import { clamp, pinOppositeEdge } from './geometry'
import { noteHeight, resolveContentHeight } from './noteSize'

/** 按元素种类给出最小外框尺寸（表格：行头列 + 逐列最小宽 / 表头 + 逐行最小高） */
export function minBoxSize(kind, rows, cols) {
  return {
    minW: kind === 'table' ? TABLE_ROW_HEADER_W + cols * TABLE_MIN_CELL_W : NODE_MIN_W,
    minH: kind === 'table' ? (rows + 1) * TABLE_MIN_CELL_H : NODE_MIN_H,
  }
}

/**
 * 拖动控制点：把屏幕位移换算回世界坐标，再按「对边固定」重算矩形。
 * @param {object} rz       手势状态（起点矩形 + 指针起点 + fromWest/fromNorth + 固定边）
 * @param {number} dx       指针 X 位移（世界坐标）
 * @param {number} dy       指针 Y 位移（世界坐标）
 * @param {object|null} liveNode  实时节点（读「实时内容高度」，不能读渲染期闭包里的旧值）
 * @returns {{ w: number, h: number, targetH: number, x: number, y: number }}
 */
export function resolveResizeGeometry(rz, dx, dy, liveNode) {
  const { fromWest, fromNorth } = rz
  const { minW, minH } = minBoxSize(rz.kind, rz.rows, rz.cols)

  // 先算宽高并夹到下限，再由固定边反推左上角 —— 拖过最小尺寸时不会「翻面」
  const w = Math.max(minW, fromWest ? rz.w - dx : rz.w + dx)
  // 指针意图 = 用户这次想设定的高度下限
  const targetH = Math.max(minH, fromNorth ? rz.h - dy : rz.h + dy)
  // 节点的生效高度：内容比下限高时停在内容高度（文字不能溢出盒子）。
  // 内容高度必须读「实时值」而不是手势起点冻结的值：
  // 拖窄会让文字重排变高，冻结值会和真实内容对不上，盒子只能往下长 → 漂移
  const contentFloor = resolveContentHeight(liveNode || rz)
  const h = rz.kind === 'node' ? noteHeight(targetH, contentFloor) : targetH
  const { x, y } = pinOppositeEdge(rz, w, h, fromWest, fromNorth)

  return { w, h, targetH, x, y }
}

/**
 * 表格外框尺寸 → 整体等比缩放逐列宽 / 逐行高（只缩放表格节点，不缩放画布）。
 * 语义仍是「拉宽列、拉高行」：文字不跟着缩放，表头行高固定不动。
 *
 * 平滑关键：缩放系数每帧都以「手势起点快照」整体重算（k = 目标尺寸 / 起点尺寸），
 * 不在上一帧结果上做增量累加 —— 舍入误差不会逐帧漂移；
 * 取整与夹取对给定 k 是确定性的，同一帧永远算出同一组值，网格不会抖。
 * @param {number} w 缩放手势意图的外框宽（世界坐标）
 * @param {number} h 缩放手势意图的外框高
 * @param {object} table 手势起点快照（含 cols / colWidths / rowHeights / headerH）
 * @returns {{ colWidths, rowHeights, headerH, fittedW, fittedH }}
 */
export function scaleTableFromBox(w, h, table) {
  const colWidths = tableColWidths(table)
  const rowHeights = tableRowHeights(table)
  const headerH = tableHeaderH(table)
  const totalW = sizesTotal(colWidths)
  const totalH = sizesTotal(rowHeights)
  const kx = totalW > 0 ? (w - TABLE_ROW_HEADER_W) / totalW : 1
  const ky = totalH > 0 ? (h - headerH) / totalH : 1
  const nextColWidths = colWidths.map((cw) =>
    Math.round(clamp(cw * kx, TABLE_MIN_CELL_W, TABLE_MAX_CELL_W)),
  )
  const nextRowHeights = rowHeights.map((rh) =>
    Math.round(clamp(rh * ky, TABLE_MIN_CELL_H, TABLE_MAX_CELL_H)),
  )
  return {
    colWidths: nextColWidths,
    rowHeights: nextRowHeights,
    headerH,
    // 拟合外框 = 缩放后数组的实际总尺寸，选中框 / 固定边反推都用它，永不与渲染错位
    fittedW: TABLE_ROW_HEADER_W + sizesTotal(nextColWidths),
    fittedH: headerH + sizesTotal(nextRowHeights),
  }
}
