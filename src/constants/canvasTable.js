/* 画布表格尺寸常量（Excel 风格），CanvasTable 与 CanvasPage 共享 */

export const TABLE_ROW_HEADER_W = 44
export const TABLE_COL_HEADER_H = 28
export const TABLE_CELL_W = 96
export const TABLE_CELL_H = 28

/* 单元格尺寸的可调范围：拖拽四角缩放表格时用来夹取，避免缩成一条线或撑到荒谬 */
export const TABLE_MIN_CELL_W = 48
export const TABLE_MAX_CELL_W = 320
export const TABLE_MIN_CELL_H = 20
export const TABLE_MAX_CELL_H = 120

/** 单元格宽 / 高：表格可被整体缩放，老数据没有这两个字段时回落到设计值 */
export const tableCellW = (table) => table.cellW ?? TABLE_CELL_W
export const tableCellH = (table) => table.cellH ?? TABLE_CELL_H

/** 表格整体世界坐标尺寸（含表头） */
export function getTableSize(table) {
  return {
    w: TABLE_ROW_HEADER_W + table.cols * tableCellW(table),
    h: TABLE_COL_HEADER_H + table.rows * tableCellH(table),
  }
}
