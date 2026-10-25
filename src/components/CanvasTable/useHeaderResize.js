/* ============================================================
   表头拖拽调整行高 / 列宽（从 useTablePointer 拆出的独立手势）
   ------------------------------------------------------------
   Excel 语义：拖列标右缘改列宽，拖行号下缘改行高。
   - 表头边缘留 6px 屏幕像素热区（不随画布缩放，任何倍率下都好抓）
   - 按下热区即捕获指针，位移换算回设计坐标逐帧写回
   - 悬停热区时切换 col-resize / row-resize 光标（表头元素没有
     自己的 cursor 样式，容器内联值只影响表头，不会盖掉单元格的）
   未命中热区时 begin 返回 false，事件交回 useTablePointer 走原逻辑。
   ============================================================ */

import { useRef } from 'react'
import {
  TABLE_MAX_CELL_H,
  TABLE_MAX_CELL_W,
  TABLE_MIN_CELL_H,
  TABLE_MIN_CELL_W,
} from '../../constants/canvasTable'

/** 表头边缘的命中热区（屏幕像素） */
const EDGE_PX = 6

/**
 * @param {object}   params
 * @param {import('react').MutableRefObject} params.wrapRef    表格容器 ref（指针捕获 / 光标）
 * @param {number}   params.scale        画布缩放倍率（屏幕位移 → 设计坐标）
 * @param {number[]} params.colWidths    当前列宽数组（按下瞬间取值做手势起点）
 * @param {number[]} params.rowHeights   当前行高数组
 * @param {Function} params.onResizeCol  (index, width)  列宽写回
 * @param {Function} params.onResizeRow  (index, height) 行高写回
 * @param {Function} [params.onActivate] 手势起始时激活表格（与单元格点击同语义）
 * @returns {{ begin, handleMove, end, clearHover }}
 */
export function useHeaderResize({ wrapRef, scale, colWidths, rowHeights, onResizeCol, onResizeRow, onActivate }) {
  const gestureRef = useRef(null)

  /** 按下表头边缘：登记手势并捕获指针；返回 true 表示事件已被消费 */
  const begin = (e) => {
    if (e.button !== 0) return false
    const wrap = wrapRef.current
    if (!wrap) return false

    const colHead = e.target.closest?.('[data-col-head]')
    if (colHead && colHead.getBoundingClientRect().right - e.clientX <= EDGE_PX) {
      const index = Number(colHead.dataset.colHead)
      gestureRef.current = { type: 'col', index, start: colWidths[index], px: e.clientX, last: -1 }
      wrap.dataset.resizing = 'col'
      wrap.setPointerCapture(e.pointerId)
      onActivate?.()
      e.preventDefault()
      e.stopPropagation()
      return true
    }

    const rowHead = e.target.closest?.('[data-row-head]')
    if (rowHead && rowHead.getBoundingClientRect().bottom - e.clientY <= EDGE_PX) {
      const index = Number(rowHead.dataset.rowHead)
      gestureRef.current = { type: 'row', index, start: rowHeights[index], py: e.clientY, last: -1 }
      wrap.dataset.resizing = 'row'
      wrap.setPointerCapture(e.pointerId)
      onActivate?.()
      e.preventDefault()
      e.stopPropagation()
      return true
    }
    return false
  }

  /** 拖拽中逐帧写回；空闲时维护表头边缘的悬停光标 */
  const handleMove = (e) => {
    const gesture = gestureRef.current
    const wrap = wrapRef.current
    if (!wrap) return

    if (gesture) {
      const pointerDelta = gesture.type === 'col' ? e.clientX - gesture.px : e.clientY - gesture.py
      const min = gesture.type === 'col' ? TABLE_MIN_CELL_W : TABLE_MIN_CELL_H
      const max = gesture.type === 'col' ? TABLE_MAX_CELL_W : TABLE_MAX_CELL_H
      // 屏幕位移 ÷ 画布缩放 = 设计坐标位移；起点值 + 本帧位移，不做增量累加
      const next = Math.round(Math.min(max, Math.max(min, gesture.start + pointerDelta / scale)))
      if (next !== gesture.last) {
        gesture.last = next
        if (gesture.type === 'col') onResizeCol(gesture.index, next)
        else onResizeRow(gesture.index, next)
      }
      e.stopPropagation()
      return
    }

    // 悬停热区光标：只在表头元素上判定，离开即还原（单元格有自己的 cursor 样式）
    const colHead = e.target.closest?.('[data-col-head]')
    const rowHead = colHead ? null : e.target.closest?.('[data-row-head]')
    let cursor = ''
    if (colHead && colHead.getBoundingClientRect().right - e.clientX <= EDGE_PX) cursor = 'col-resize'
    else if (rowHead && rowHead.getBoundingClientRect().bottom - e.clientY <= EDGE_PX) cursor = 'row-resize'
    if (wrap.style.cursor !== cursor) wrap.style.cursor = cursor
  }

  /** 松手收口：释放指针捕获、还原光标 */
  const end = (e) => {
    if (!gestureRef.current) return
    gestureRef.current = null
    const wrap = wrapRef.current
    if (wrap) {
      delete wrap.dataset.resizing
      wrap.style.cursor = ''
      if (wrap.hasPointerCapture(e.pointerId)) wrap.releasePointerCapture(e.pointerId)
    }
    e.stopPropagation()
  }

  /** 指针离开表格时还原悬停光标 */
  const clearHover = () => {
    const wrap = wrapRef.current
    if (wrap && !gestureRef.current && wrap.style.cursor) wrap.style.cursor = ''
  }

  return { begin, handleMove, end, clearHover }
}
