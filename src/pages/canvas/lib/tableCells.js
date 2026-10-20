/* ============================================================
   表格单元格矩阵 —— 纯函数
   ------------------------------------------------------------
   画布表格的 cells 是「二维字符串矩阵」。这里集中处理
   清空 / 粘贴两类矩阵运算，不依赖 React、不读写状态，
   供 useCanvasTables 的不可变更新调用。
   ============================================================ */

/**
 * 清空一组单元格（表格内多选后按 Delete）
 * @param {string[][]} cells      原矩阵
 * @param {Array<{r:number, c:number}>} coords 要清空的坐标列表
 * @returns {string[][]} 新矩阵（一次复制，避免逐格 setState）
 */
export function clearCellsInMatrix(cells, coords) {
  const next = cells.map((row) => [...row])
  coords.forEach(({ r, c }) => {
    if (next[r] && c >= 0 && c < next[r].length) next[r][c] = ''
  })
  return next
}

/**
 * 把一块二维文本矩阵贴入表格，放不下时按 Excel 的行为自动扩行扩列。
 * 表格尺寸由 rows/cols 推导（见 getTableSize），所以只需补空格子即可。
 * @param {{rows:number, cols:number, cells:string[][]}} table 目标表格
 * @param {number} r0    落点行
 * @param {number} c0    落点列
 * @param {string[][]} block 待粘贴的二维文本
 * @returns {{rows:number, cols:number, cells:string[][]}} 新尺寸与新矩阵
 */
export function pasteBlockIntoTable(table, r0, c0, block) {
  const blockW = Math.max(...block.map((row) => row.length))
  const rows = Math.max(table.rows, r0 + block.length)
  const cols = Math.max(table.cols, c0 + blockW)

  // 先按新尺寸补齐（保留原有内容，新增格子填空串）
  const cells = Array.from({ length: rows }, (_, r) => {
    const src = table.cells[r] ?? []
    return Array.from({ length: cols }, (_, c) => src[c] ?? '')
  })

  block.forEach((row, dr) => {
    row.forEach((value, dc) => {
      const r = r0 + dr
      const c = c0 + dc
      if (cells[r] && c < cols) cells[r][c] = value
    })
  })

  return { rows, cols, cells }
}

/** 建一张 rows × cols 的空矩阵（新表格的初始 cells） */
export function createEmptyCells(rows, cols) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''))
}
