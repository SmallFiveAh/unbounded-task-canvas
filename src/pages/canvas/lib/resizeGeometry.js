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
} from '../../../constants/canvasTable'
import { NODE_MIN_H, NODE_MIN_W } from './constants'
import { clamp, pinOppositeEdge } from './geometry'
import { noteHeight, resolveContentHeight } from './noteSize'

/** 按元素种类给出最小外框尺寸（表格总高 = 表头行 + rows 行，表头行高与单元格共用 cellH） */
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
 * 表格外框尺寸换算成统一的单元格宽 / 高。
 * 只改行列尺寸、不缩放内容 —— 字不会被拉扁，语义上等于「拉宽列、拉高行」。
 * @returns {{ cellW, cellH, fittedW, fittedH }} 单元格尺寸与按其拟合出的外框尺寸
 */
export function tableCellSizeFromBox(w, h, rows, cols) {
  const cellW = Math.round(
    clamp((w - TABLE_ROW_HEADER_W) / cols, TABLE_MIN_CELL_W, TABLE_MAX_CELL_W),
  )
  const cellH = Math.round(clamp(h / (rows + 1), TABLE_MIN_CELL_H, TABLE_MAX_CELL_H))
  return {
    cellW,
    cellH,
    fittedW: TABLE_ROW_HEADER_W + cols * cellW,
    fittedH: (rows + 1) * cellH,
  }
}
