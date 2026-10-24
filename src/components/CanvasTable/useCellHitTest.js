/* ============================================================
   单元格命中测试（从 useTablePointer 拆出）
   ------------------------------------------------------------
   · cellFromPoint：屏幕坐标 → 单元格坐标
     （网格实测尺寸从 DOM 查询，见 tableGeometry.cellFromPoint）
   · detectDoubleClick：双击是「指针按下瞬间」用时间 + 同格自行判定的
     （画布内的 pointerdown 既做了 preventDefault 又对容器做了捕获，
     原生 dblclick 会被吞掉或重定向到容器，目标不再是单元格）
   ============================================================ */

import { useRef } from 'react'
import { cellFromPoint as cellFromPointPure, cellKey } from './tableGeometry'

/** 同一个单元格两次按下视为「双击」的时间窗（毫秒） */
const DOUBLE_PRESS_MS = 400

/**
 * @param {object} wrapRef 表格容器 ref（查询 [data-grid] 实测网格尺寸）
 * @param {number} rows 行数
 * @param {number} cols 列数
 * @param {number} cellW 单元格宽
 * @param {number} cellH 单元格高
 */
export function useCellHitTest({ wrapRef, rows, cols, cellW, cellH }) {
  const dblPressRef = useRef({ key: null, time: 0 }) // 自实现的双击判定基准

  /** 屏幕坐标 → 单元格坐标（clampToEdges：越界时夹到表格边缘，用于拖拽框选） */
  const cellFromPoint = (clientX, clientY, clampToEdges) => {
    const grid = wrapRef.current?.querySelector('[data-grid]')
    if (!grid) return null
    return cellFromPointPure({
      clientX,
      clientY,
      gridRect: grid.getBoundingClientRect(),
      rows,
      cols,
      cellW,
      cellH,
      clamp: clampToEdges,
    })
  }

  /** 双击判定：同一格在时间窗内两次按下即进入编辑（画布内原生 dblclick 不可靠，见文件头注释） */
  const detectDoubleClick = (cell) => {
    const now = performance.now()
    const lastPress = dblPressRef.current
    if (lastPress.key === cellKey(cell.r, cell.c) && now - lastPress.time <= DOUBLE_PRESS_MS) {
      dblPressRef.current = { key: null, time: 0 } // 重置，避免连续按下重复触发
      return true
    }
    dblPressRef.current = { key: cellKey(cell.r, cell.c), time: now }
    return false
  }

  /** 作废双击基准（开始拖拽框选时调用，避免拖完后误判为双击） */
  const resetDoublePress = () => {
    dblPressRef.current = { key: null, time: 0 }
  }

  return { cellFromPoint, detectDoubleClick, resetDoublePress }
}
