/* ============================================================
   表格几何 —— 纯函数
   ------------------------------------------------------------
   单元格坐标（行列）与选区的表示完全在这里定义：
   · 单元格用 { r, c } 表示
   · 选区用 Set<'r:c'> 表示（字符串 key 便于去重与集合运算）
   不依赖 React，也不读写状态。
   ============================================================ */

import { TABLE_ROW_HEADER_W } from '../../constants/canvasTable'

/** 列标 A, B, C … */
export const colLetter = (i) => String.fromCharCode(65 + i) // A, B, C …

/** 单元格坐标 → 选区 key */
export const cellKey = (r, c) => `${r}:${c}`

/** 选区 key → 单元格坐标 */
export const keyToCoord = (key) => {
  const [r, c] = key.split(':').map(Number)
  return { r, c }
}

/** 两个对角单元格之间的矩形范围（含端点）对应的 key 列表 */
export function rectKeys(r1, c1, r2, c2) {
  const keys = []
  const rMin = Math.min(r1, r2)
  const rMax = Math.max(r1, r2)
  const cMin = Math.min(c1, c2)
  const cMax = Math.max(c1, c2)
  for (let r = rMin; r <= rMax; r += 1) {
    for (let c = cMin; c <= cMax; c += 1) keys.push(cellKey(r, c))
  }
  return keys
}

/** 选区包围盒（Excel 语义：选区中间没选中的格子也一起复制） */
export function selectionBox(selection) {
  if (!selection.size) return null
  let r1 = Infinity
  let r2 = -Infinity
  let c1 = Infinity
  let c2 = -Infinity
  selection.forEach((key) => {
    const { r, c } = keyToCoord(key)
    if (r < r1) r1 = r
    if (r > r2) r2 = r
    if (c < c1) c1 = c
    if (c > c2) c2 = c
  })
  return { r1, r2, c1, c2 }
}

/**
 * 屏幕坐标 → 单元格坐标（按网格实测尺寸与设计尺寸之比换算缩放，不依赖外部 scale）。
 * 表头行高与单元格共用 cellH，总高 = (rows + 1) * cellH（见 canvasTable.js）。
 * @param {object} params
 * @param {number} params.clientX      屏幕 X
 * @param {number} params.clientY      屏幕 Y
 * @param {DOMRect} params.gridRect    网格容器的实测包围盒
 * @param {number} params.rows
 * @param {number} params.cols
 * @param {number} params.cellW
 * @param {number} params.cellH
 * @param {boolean} [params.clamp]     true 时越界夹到最近边缘（拖拽框选保持扩展到末行/末列）
 * @returns {{r:number, c:number}|null} 不在网格内且未开启 clamp 时返回 null
 */
export function cellFromPoint({ clientX, clientY, gridRect, rows, cols, cellW, cellH, clamp = false }) {
  const kx = gridRect.width / (TABLE_ROW_HEADER_W + cols * cellW)
  const ky = gridRect.height / ((rows + 1) * cellH)
  if (!kx || !ky) return null
  const c = Math.floor(((clientX - gridRect.left) / kx - TABLE_ROW_HEADER_W) / cellW)
  const r = Math.floor(((clientY - gridRect.top) / ky - cellH) / cellH)
  const inside = r >= 0 && r < rows && c >= 0 && c < cols
  if (!inside && !clamp) return null
  return {
    r: Math.min(rows - 1, Math.max(0, r)),
    c: Math.min(cols - 1, Math.max(0, c)),
  }
}

/**
 * 按下单元格时的选区语义（与 Excel 一致），返回新的选区与锚点：
 * · Shift：锚点 → 目标的矩形；Ctrl+Shift 叠加到现有选区
 * · Ctrl/⌘：把单元格加入或移出选区
 * · 普通单击：只选中该格，锚点落在该格
 * @param {object} params
 * @param {boolean} params.additive   Ctrl/⌘ 按下
 * @param {boolean} params.shift      Shift 按下
 * @param {{r:number, c:number}|null} params.anchor   当前锚点
 * @param {Set<string>} params.selection              当前选区
 * @param {{r:number, c:number}} params.cell          目标单元格
 * @returns {{selection:Set<string>, anchor:{r:number, c:number}}}
 */
export function resolvePressSelection({ additive, shift, anchor, selection, cell }) {
  if (shift) {
    const from = anchor ?? cell
    const next = additive ? new Set(selection) : new Set()
    rectKeys(from.r, from.c, cell.r, cell.c).forEach((k) => next.add(k))
    return { selection: next, anchor: from }
  }
  if (additive) {
    const next = new Set(selection)
    const key = cellKey(cell.r, cell.c)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return { selection: next, anchor: cell }
  }
  return { selection: new Set([cellKey(cell.r, cell.c)]), anchor: cell }
}
