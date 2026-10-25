/* ============================================================
   编辑态输入框自动增高 —— 从 CanvasNodeItem 拆出的行为 hook
   ------------------------------------------------------------
   编辑态 textarea：height:auto 后由 scrollHeight 决定实际高度，
   与展示态 span 的换行行为一致（排版属性两态共用一套，
   见 CanvasNodeLayer.module.css 注释）。
   用 useLayoutEffect 在绘制前完成增高：先 auto 再由 scrollHeight
   定高，两态（标题 / 正文）都不出现「先按 1 行渲染再被撑高」的闪跳。
   ============================================================ */

import { useLayoutEffect, useRef } from 'react'

const autoGrow = (el) => {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

/**
 * @param {boolean} editing  该节点是否处于编辑态
 * @param {string} draft     编辑草稿（内容变化即重新增高）
 * @returns {{inputRef, titleInputRef}} 正文输入框 / 卡片标题输入框的 ref
 */
export function useEditAutoGrow(editing, draft) {
  // 正文输入框 ref（普通节点 / 便签 / 卡片正文共用）
  const inputRef = useRef(null)
  // 卡片 / 列表卡片标题编辑框 ref（多行 textarea，随内容自动增高）
  const titleInputRef = useRef(null)

  useLayoutEffect(() => {
    if (!editing) return
    autoGrow(inputRef.current)
    autoGrow(titleInputRef.current)
  }, [editing, draft])

  return { inputRef, titleInputRef }
}
