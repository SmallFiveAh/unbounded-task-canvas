/* cellSelection.js 冒烟测试（Node assert，ESM） */
import assert from 'node:assert'
import {
  forEachCell,
  toggleCell,
  isCellSelected,
  collectCells,
  shiftRange,
  toggleRange,
  mergeSelection,
} from './cellSelection.js'

// 基础工具：forEachCell
assert.deepEqual(
  (() => { const out = []; forEachCell(3, 3, 0, 0, 2, 2, (r, c) => out.push({ r, c })); return out })(),
  [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }]
)

// 越界钳位
assert.deepEqual(
  (() => { const out = []; forEachCell(2, 2, -1, -1, 3, 3, (r, c) => out.push({ r, c })); return out })(),
  [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }]
)

// collectCells
assert.deepEqual(collectCells(3, 3, 1, 1, 2, 2), [
  { r: 1, c: 1 }, { r: 1, c: 2 },
  { r: 2, c: 1 }, { r: 2, c: 2 },
])

// 反向坐标
assert.deepEqual(collectCells(3, 3, 2, 2, 0, 0), [
  { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 },
  { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 },
  { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 },
])

// toggleCell
const t0 = toggleCell([], 1, 2)
assert.strictEqual(t0.length, 1)
assert.deepStrictEqual(t0[0], { r: 1, c: 2 })
const t1 = toggleCell(t0, 1, 2)
assert.strictEqual(t1.length, 0)
const t2 = toggleCell(t1, 0, 0)
assert.strictEqual(t2.length, 1)

// isCellSelected
assert.strictEqual(isCellSelected([{ r: 0, c: 0 }], 0, 0), true)
assert.strictEqual(isCellSelected([{ r: 0, c: 0 }], 1, 1), false)

// shiftRange
const shiftRes = shiftRange([], { r: 1, c: 1 }, 3, 2, 5, 5)
assert.deepEqual(shiftRes, [
  { r: 1, c: 1 }, { r: 1, c: 2 },
  { r: 2, c: 1 }, { r: 2, c: 2 },
  { r: 3, c: 1 }, { r: 3, c: 2 },
])

// toggleRange：空列表 + 单格
const tr1 = toggleRange([], 1, 1, 1, 1)
assert.deepEqual(tr1, [{ r: 1, c: 1 }])
// toggleRange：再 toggle 同一格（应清除）
const tr2 = toggleRange(tr1, 1, 1, 1, 1)
assert.deepEqual(tr2, [])
// toggleRange：两格区域 toggle
const base = [{ r: 0, c: 0 }]
const tr3 = toggleRange(base, 0, 0, 1, 1)
assert.deepEqual(tr3, [
  { r: 0, c: 1 },
  { r: 1, c: 0 },
  { r: 1, c: 1 },
])

// mergeSelection（replace 模式）
const m0 = [{ r: 0, c: 0 }]
const collected = [{ r: 0, c: 1 }, { r: 1, c: 1 }]
const m1 = mergeSelection(m0, collected, false)
assert.deepEqual(m1, [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }])

// mergeSelection（toggle 模式：实际走 toggleRange，这里只测 replace）
const m2 = mergeSelection(m0, collected, true)
assert.deepEqual(m2, [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }])

console.log('cellSelection tests passed')
