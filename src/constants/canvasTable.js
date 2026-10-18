/* 画布表格尺寸常量（Excel 风格），CanvasTable 与 CanvasPage 共享 */

export const TABLE_ROW_HEADER_W = 44
export const TABLE_COL_HEADER_H = 28
export const TABLE_CELL_W = 96
export const TABLE_CELL_H = 28

/** 表格整体世界坐标尺寸（含表头） */
export function getTableSize(rows, cols) {
  return {
    w: TABLE_ROW_HEADER_W + cols * TABLE_CELL_W,
    h: TABLE_COL_HEADER_H + rows * TABLE_CELL_H,
  }
}
