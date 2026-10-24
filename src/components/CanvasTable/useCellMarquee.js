/* ============================================================
   单元格拖拽框选（从 useTablePointer 拆出）
   ------------------------------------------------------------
   从单元格按下并拖拽：实时框选矩形范围，越界时夹到表格边缘继续扩展。
   尚未离开起始格时不改变选区（保证单击语义干净）；真正开始拖拽时
   会作废双击基准（onMarqueeStart），避免拖完后误判为双击。
   ============================================================ */

import { useRef } from 'react'
import { rectKeys } from './tableGeometry'

/**
 * @param {object} wrapRef       表格容器 ref（指针捕获 / 释放）
 * @param {Function} cellFromPoint 屏幕坐标 → 单元格坐标（越界夹边）
 * @param {Function} setSelection  选中集合更新
 * @param {Function} setCursor     光标更新
 * @param {Function} onMarqueeStart 拖拽真正开始（离开起始格）时的回调
 */
export function useCellMarquee({ wrapRef, cellFromPoint, setSelection, setCursor, onMarqueeStart }) {
  const dragRef = useRef(null) // 单元格框选状态

  /** 记录拖拽基准：drag 过程中在 base 之上叠加「起点 → 当前格」的矩形，并捕获指针 */
  const begin = (cell, base, e) => {
    dragRef.current = {
      base: new Set(base),
      start: cell,
      last: cell,
      moved: false,
    }
    wrapRef.current?.setPointerCapture(e.pointerId)
    wrapRef.current?.focus({ preventScroll: true })
  }

  const handleMove = (e) => {
    const drag = dragRef.current
    if (!drag) return

    const cell = cellFromPoint(e.clientX, e.clientY, true)
    if (!cell) return
    if (cell.r === drag.last.r && cell.c === drag.last.c) return

    drag.last = cell
    // 尚未离开起始格时不改变选区（保证单击语义干净）
    if (!drag.moved) {
      if (cell.r === drag.start.r && cell.c === drag.start.c) return
      drag.moved = true
      // 真的在拖拽框选：作废双击基准，避免拖完后紧接着的一次按下被误判为双击
      onMarqueeStart?.()
    }

    e.stopPropagation()
    const next = new Set(drag.base)
    rectKeys(drag.start.r, drag.start.c, cell.r, cell.c).forEach((k) => next.add(k))
    setSelection(next)
    setCursor(cell)
  }

  const end = (e) => {
    const drag = dragRef.current
    if (!drag) return // 表格整体拖拽由父级的视口事件收尾
    dragRef.current = null
    e.stopPropagation()
    if (wrapRef.current?.hasPointerCapture(e.pointerId)) {
      wrapRef.current.releasePointerCapture(e.pointerId)
    }
  }

  return { begin, handleMove, end }
}
