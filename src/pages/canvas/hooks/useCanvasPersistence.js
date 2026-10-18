/* ============================================================
   画布持久化 —— 内容 / 视图 → localStorage
   ------------------------------------------------------------
   · 画布内容（节点 / 连线 / 表格）变化 → 节流落盘 + 右上角「已保存」提示
   · 视图（缩放 + 平移）变化 → 静默落盘，不弹提示、不惊动任务列表缩略图
   · 关闭 / 刷新页面前 flush 掉未落盘的改动
   · 保存提示直接操作 DOM：只在数据变化时出现，5 秒无变化后淡出，
     不参与 React 渲染，避免每次落盘都重渲染整张画布
   ============================================================ */

import { useCallback, useEffect, useRef } from 'react'
import { createSaver } from '../../../utils/canvasStore'
import { SAVED_HINT_DURATION } from '../lib/constants'

export function useCanvasPersistence({
  task,
  initial,
  initialView,
  nodes,
  edges,
  tables,
  view,
  viewRef,
}) {
  const saverRef = useRef(null)
  const savedHintRef = useRef(null)
  const hideTimerRef = useRef(null)

  // 每次落盘点亮提示，并重新开始 5 秒倒计时
  const flashSaved = useCallback(() => {
    const el = savedHintRef.current
    if (!el) return
    el.dataset.visible = 'true'
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null
      el.dataset.visible = 'false'
    }, SAVED_HINT_DURATION)
  }, [])

  useEffect(() => {
    if (!task) return undefined
    const saver = createSaver(task.id)
    saverRef.current = saver
    // 关闭/刷新页面前把未落盘的改动写掉
    const flush = () => saver.flush()
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
      saverRef.current = null
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
      saver.flush()
    }
  }, [task])

  // 节点/连线/表格任一变化都写回本地存档
  useEffect(() => {
    if (!task || !saverRef.current) return
    // 初次挂载时的状态就是存档/种子本身，不算「数据发生变化」
    if (
      nodes === initial.nodes &&
      edges === initial.edges &&
      tables === initial.tables
    ) {
      return
    }
    flashSaved()
    saverRef.current.save({ nodes, edges, tables, view: viewRef.current })
  }, [task, initial, nodes, edges, tables, flashSaved, viewRef])

  // 视图（缩放比例 + 平移）也落盘：下次打开原样回到这个视角。
  // 静默保存 —— 不弹「已保存到本地」，也不广播给任务列表缩略图。
  useEffect(() => {
    if (!task || !saverRef.current) return
    if (view === initialView) return // 与初始视角一致，无需重复写
    saverRef.current.save({ nodes, edges, tables, view }, { notify: false })
  }, [task, initialView, view, nodes, edges, tables])

  return { savedHintRef }
}
