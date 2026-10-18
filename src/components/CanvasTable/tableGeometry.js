/* ============================================================
   表格几何 —— 纯函数
   ------------------------------------------------------------
   单元格坐标（行列）与选区的表示完全在这里定义：
   · 单元格用 { r, c } 表示
   · 选区用 Set<'r:c'> 表示（字符串 key 便于去重与集合运算）
   不依赖 React，也不读写状态。
   ============================================================ */

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
