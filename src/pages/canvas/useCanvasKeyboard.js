/* ============================================================
   画布快捷键
   ------------------------------------------------------------
   · Delete / Backspace：删除当前主选中元素（表格 id 以 t- 开头，其余为节点）
   · Esc：取消编辑 + 取消选中
   · 空格（按住）：进入临时平移模式，松开即退出
   按键监听挂在 window 上：焦点可能停在 body（点过画布后很常见），
   因此用「是否在输入框 / 可编辑区」来判断要不要接管。
   ============================================================ */

import { useEffect, useState } from 'react'

export function useCanvasKeyboard({
  selectedId,
  removeNode,
  removeTable,
  clearSelection,
}) {
  const [spaceDown, setSpaceDown] = useState(false)

  useEffect(() => {
    const onKeyDown = (e) => {
      const target = e.target
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !isTyping) {
        e.preventDefault()
        // 表格 id 以 t- 开头；其余为节点
        if (String(selectedId).startsWith('t-')) {
          removeTable(selectedId)
        } else {
          removeNode(selectedId)
        }
      } else if (e.key === 'Escape') {
        clearSelection()
      } else if (e.key === ' ' && !isTyping && !spaceDown) {
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
  }, [selectedId, removeNode, removeTable, spaceDown, clearSelection])

  return { spaceDown }
}
