/* ============================================================
   节点高度自适应 —— 从 CanvasNodeItem 拆出的行为 hook
   ------------------------------------------------------------
   ResizeObserver 实测高度回写 store（node.h 是连线锚点 /
   选中框 / 缩略图的几何来源），实测与已落库值一致时不触发更新，
   避免「测量 → 回写 → 再测量」的抖动循环。

   高度有两个来源，分两个字段存（见 lib/noteSize.js）：
   · minH      用户拖动控制点设的下限 —— 唯一参与布局的高度输入
   · contentH  内容实测高度 —— 只用于「不可缩到内容以下」的判定
   · h         测量结果 —— 恒等于渲染高度，供选中框 / 连线 / 缩略图读取
   ============================================================ */

import { useEffect, useLayoutEffect, useRef } from 'react'
import { measureNoteContentHeight, resolveContentHeight } from '../../lib/noteSize'

/**
 * @param {object} node               画布节点
 * @param {(id: string, patch: object) => void} onNodeSizeChange 实测尺寸回写
 * @param {object} [options]          可选项
 * @param {boolean} [options.measureWidth] 同时实测宽度并回写
 *   （思维导图节点：宽度也随内容自适应，自动布局需要真实 w/h）
 * @returns {import('react').MutableRefObject} 挂在节点容器上的 ref
 */
export function useNodeAutoHeight(node, onNodeSizeChange, { measureWidth = false } = {}) {
  const nodeRef = useRef(null)

  // 已落库的度量经 ref 读取：effect 只依赖节点身份，打字引起的高度变化
  // 全部走测量回调，不重建 ResizeObserver。
  // 用 useLayoutEffect：观察器回调在绘制前触发，必须在此之前拿到最新值，
  // 否则每帧都会拿旧值重复回写一次（缩放拖拽时等于每帧多渲染一轮）
  const metricsRef = useRef({ w: node.w, h: node.h, contentH: resolveContentHeight(node) })
  useLayoutEffect(() => {
    metricsRef.current = { w: node.w, h: node.h, contentH: resolveContentHeight(node) }
  }, [node.w, node.h, node.contentH])

  useEffect(() => {
    const el = nodeRef.current
    if (!el) return undefined
    const syncMetrics = () => {
      const prev = metricsRef.current
      if (measureWidth) {
        // 宽高一起量（思维导图）：宽度随内容自适应，两个方向都可能变
        const boxW = el.offsetWidth
        const boxH = el.offsetHeight
        if (boxW === prev.w && boxH === prev.h) return
        onNodeSizeChange(node.id, { w: boxW, h: boxH })
        return
      }
      const boxH = el.offsetHeight
      const contentH = measureNoteContentHeight(el)
      // 取整比较：亚像素差异（字体度量）不落库，防止高频抖动
      if (boxH === prev.h && Math.abs(contentH - prev.contentH) < 1) return
      onNodeSizeChange(node.id, { h: boxH, contentH })
    }
    const observer = new ResizeObserver(syncMetrics)
    observer.observe(el)
    // 内容节点单独观察：容器被 minH 撑住时，文字增减不会改变容器尺寸，
    // 只盯着容器就量不到内容高度 —— 拖控制点时的下限判定会因此失准
    if (el.firstElementChild && !measureWidth) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [node.id, onNodeSizeChange, measureWidth])

  return nodeRef
}
