/* 画布表格尺寸常量与行列几何（Excel 风格），CanvasTable 与 CanvasPage 共享
   ------------------------------------------------------------
   尺寸模型：每列宽 / 每行高各存一个数组（colWidths / rowHeights），
   表头行高独立存 headerH（表头是界面框架，不随行高缩放）。
   老数据没有数组时回落到统一的 cellW / cellH（tableColWidths 等兜底），
   存档 normalize（见 canvasStore.normalizeTable）后一律物化成数组。 */

export const TABLE_ROW_HEADER_W = 44
export const TABLE_COL_HEADER_H = 28
export const TABLE_CELL_W = 96
export const TABLE_CELL_H = 28

/** 行列尺寸的可调范围：拖表头 / 缩放表格时用来夹取，避免缩成一条线或撑到荒谬 */
export const TABLE_MIN_CELL_W = 48
export const TABLE_MAX_CELL_W = 320
export const TABLE_MIN_CELL_H = 20
export const TABLE_MAX_CELL_H = 120

const clampRange = (v, min, max) => Math.min(max, Math.max(min, v))
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const sum = (sizes) => sizes.reduce((acc, v) => acc + v, 0)

/** 单元格宽 / 高：老数据回落字段（逐列 / 逐行数组的缺省填充值） */
export const tableCellW = (table) => table.cellW ?? TABLE_CELL_W
export const tableCellH = (table) => table.cellH ?? TABLE_CELL_H

/** 每列宽度（设计坐标）：优先逐列数组，老数据用统一 cellW 填充 */
export function tableColWidths(table) {
  const fallback = clampRange(tableCellW(table), TABLE_MIN_CELL_W, TABLE_MAX_CELL_W)
  return Array.from({ length: table.cols }, (_, i) => {
    const v = table.colWidths?.[i]
    return isNum(v) ? Math.round(clampRange(v, TABLE_MIN_CELL_W, TABLE_MAX_CELL_W)) : fallback
  })
}

/** 每行高度（设计坐标）：优先逐行数组，老数据用统一 cellH 填充 */
export function tableRowHeights(table) {
  const fallback = clampRange(tableCellH(table), TABLE_MIN_CELL_H, TABLE_MAX_CELL_H)
  return Array.from({ length: table.rows }, (_, i) => {
    const v = table.rowHeights?.[i]
    return isNum(v) ? Math.round(clampRange(v, TABLE_MIN_CELL_H, TABLE_MAX_CELL_H)) : fallback
  })
}

/** 表头行高：独立字段，老数据回落到统一 cellH（与旧行为逐像素一致） */
export function tableHeaderH(table) {
  return isNum(table.headerH)
    ? Math.round(clampRange(table.headerH, TABLE_MIN_CELL_H, TABLE_MAX_CELL_H))
    : clampRange(tableCellH(table), TABLE_MIN_CELL_H, TABLE_MAX_CELL_H)
}

/** 行 / 列尺寸求和 */
export const sizesTotal = sum

/** 前缀和偏移：[0, s0, s0+s1, …]，长度 = 行/列数 + 1，供蚂蚁线 / 命中测试定位 */
export function sizeOffsets(sizes) {
  const offsets = [0]
  for (const v of sizes) offsets.push(offsets[offsets.length - 1] + v)
  return offsets
}

/** 尺寸数组按需延长（粘贴扩行/扩列时新增行高列宽沿用最后一个值，视觉连续） */
export function extendSizes(sizes, length) {
  const last = sizes[sizes.length - 1] ?? TABLE_CELL_W
  return Array.from({ length }, (_, i) => sizes[i] ?? last)
}

/** 表格整体世界坐标尺寸（行头列 + 列标表头 + 数据区） */
export function getTableSize(table) {
  return {
    w: TABLE_ROW_HEADER_W + sum(tableColWidths(table)),
    h: tableHeaderH(table) + sum(tableRowHeights(table)),
  }
}
