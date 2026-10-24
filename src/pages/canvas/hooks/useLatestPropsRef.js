import { useLayoutEffect, useRef } from 'react'

/* ============================================================
   最新 props 快照 ref（通用）
   ------------------------------------------------------------
   让回调身份保持稳定的同时始终读到最新状态：
   每次提交同步把整包 props 写进 ref，事件回调经由 ref 取值。
   用 useLayoutEffect（而非 render 期间直接写 ref）：它在同一提交里
   同步执行，任何后续指针事件到来前必然已完成 —— 没有读到旧值的窗口
   ============================================================ */

/**
 * @param {object} props 需要在回调里读取最新值的 props / 状态集合
 * @returns {object} ref（.current 始终是最近一次提交的 props 快照）
 */
export function useLatestPropsRef(props) {
  const ref = useRef({})
  useLayoutEffect(() => {
    ref.current = props
  })
  return ref
}
