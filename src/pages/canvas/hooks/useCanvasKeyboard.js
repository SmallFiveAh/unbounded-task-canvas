/* ============================================================
   画布快捷键
   ------------------------------------------------------------
   · Delete / Backspace：删除「全部选中元素」—— selectedIds 才是真源，
     框选（或 Ctrl 点选）会得到多个 id，不能只删主选中 selectedId
   · Esc：取消编辑 + 取消选中
   · 空格（按住）：进入临时平移模式，松开即退出
   按键监听挂在 window 上：焦点可能停在 body（点过画布后很常见），
   因此用「是否在输入框 / 可编辑区」来判断要不要接管。

   注意：表格单元格的键盘监听挂在 window 捕获阶段，按 Delete 时会
   阻止冒泡，所以「清了单元格」不会连带把整张表删掉。
   ============================================================ */

import { useEffect, useState } from 'react'

/**
 * @param {object} params
 * @param {string[]} params.selectedIds            当前选中的全部元素 id（节点 + 表格）
 * @param {(ids: string[]) => void} params.removeElements 批量删除
 * @param {() => void} params.clearSelection       清空选中
 */
export function useCanvasKeyboard({ selectedIds, removeElements, clearSelection }) {
  const [spaceDown, setSpaceDown] = useState(false)

  useEffect(() => {
    const onKeyDown = (e) => {
      const target = e.target
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      // 删除：整批交给文档层（框选可能同时含节点与表格），不接受单选退化
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isTyping || selectedIds.length === 0) return
        e.preventDefault()
        removeElements(selectedIds)
        return
      }

      if (e.key === 'Escape') {
        clearSelection()
        return
      }

      if (e.key === ' ' && !isTyping && !spaceDown) {
        // 空格键按下：进入临时平移模式（仅在选择工具下生效）
        e.preventDefault()
        setSpaceDown(true)
      }
    }
    const onKeyUp = (e) => {
      if (e.key === ' ') {
        setSpaceDown(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [selectedIds, removeElements, spaceDown, clearSelection])

  return { spaceDown }
}
