/* ============================================
  单元格选区纯函数（不依赖 React / DOM）
  供 CanvasTable 复用，并可直接被 Node 冒烟测试覆盖
  ============================================ */

/** 对矩形区域内的每个格子调用 fn(r, c, list) */
export function forEachCell(rows, cols, r1, c1, r2, c2, fn) {
  for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
    if (r < 0 || r >= rows) continue
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
      if (c < 0 || c >= cols) continue
      fn(r, c)
    }
  }
}

/** 切换单个单元格的选中状态（不修改原数组） */
export function toggleCell(list, r, c) {
  const idx = list.findIndex((x) => x.r === r && x.c === c)
  if (idx === -1) return [...list, { r, c }]
  return list.filter((_, i) => i !== idx)
}

/** 判断单元格是否在选区内 */
export function isCellSelected(list, r, c) {
  return list.some((x) => x.r === r && x.c === c)
}

/** 收集矩形区域内所有有效单元格（已 clamp，按行优先） */
export function collectCells(rows, cols, r1, c1, r2, c2) {
  const out = []
  forEachCell(rows, cols, r1, c1, r2, c2, (r, c) => out.push({ r, c }))
  return out
}

/**
 * Shift 范围选择：以 anchor 与 cell 围成的矩形 replace
 */
export function shiftRange(list, anchor, r, c, rows, cols) {
  return collectCells(rows, cols, anchor.r, anchor.c, r, c)
}

/**
 * Ctrl/Cmd toggle 模式：对矩形区域做 toggle
 */
export function toggleRange(list, r1, c1, r2, c2) {
  const set = new Set(list.map((x) => `${x.r},${x.c}`))
  forEachCell(999, 999, r1, c1, r2, c2, (r, c) => {
    const k = `${r},${c}`
    if (set.has(k)) set.delete(k)
    else set.add(k)
  })
  return [...set]
    .map((k) => {
      const [r, c] = k.split(',').map(Number)
      return { r, c }
    })
    .sort((a, b) => a.r - b.r || a.c - b.c)
}

/**
 * 合并选中：
 * - toggleMode 时：collect 与 toggle 合并
 * - replaceMode 时：保留已有 + 追加新 collect（仅新区域不在原有列表时追加）
 */
export function mergeSelection(existing, collected, toggleMode) {
  if (toggleMode) {
    return toggleRange(existing, collected[0]?.r ?? 0, collected[0]?.c ?? 0,
                       collected[collected.length - 1]?.r ?? 0, collected[collected.length - 1]?.c ?? 0)
  }
  const existingSet = new Set(existing.map((x) => `${x.r},${x.c}`))
  const added = collected.filter((x) => !existingSet.has(`${x.r},${x.c}`))
  return [...existing, ...added]
}
