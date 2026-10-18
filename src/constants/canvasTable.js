/* 画布表格尺寸常量（Excel 风格），CanvasTable 与 CanvasPage 共享 */

export const TABLE_ROW_HEADER_W = 44
export const TABLE_COL_HEADER_H = 28
export const TABLE_CELL_W = 96
export const TABLE_CELL_H = 28

/** 单元格尺寸的可调范围：拖拽四角缩放表格时用来夹取，避免缩成一条线或撑到荒谬 */
export const TABLE_MIN_CELL_W = 48
export const TABLE_MAX_CELL_W = 320
export const TABLE_MIN_CELL_H = 20
export const TABLE_MAX_CELL_H = 120

/**
 * 表头行高：与单元格共用同一个值（见 CanvasTable 的 --cell-h）。
 * 所以表格总高度 = (rows + 1) * cellH，而不是「固定表头高 + rows * cellH」——
 * 两者只在默认 cellH = 28 时恰好相等，缩放行高后选中框就会和表格错位。
 */
export const tableHeaderH = (table) => tableCellH(table)

/** 单元格宽 / 高：表格可被整体缩放，老数据没有这两个字段时回落到设计值 */
export const tableCellW = (table) => table.cellW ?? TABLE_CELL_W
export const tableCellH = (table) => table.cellH ?? TABLE_CELL_H

/** 表格整体世界坐标尺寸（含表头行，表头行高跟随 cellH） */
export function getTableSize(table) {
  const cellW = tableCellW(table)
  const cellH = tableCellH(table)
  return {
    w: TABLE_ROW_HEADER_W + table.cols * cellW,
    h: tableHeaderH(table) + table.rows * cellH,
  }
}
