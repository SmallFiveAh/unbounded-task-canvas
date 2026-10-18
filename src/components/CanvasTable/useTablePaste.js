/* ============================================================
   表格粘贴 —— 监听 window 的 paste 事件
   ------------------------------------------------------------
   用 paste 事件而不是 navigator.clipboard.readText()：
   前者能同步拿到 clipboardData、不需要授权，且 Ctrl+V / 右键菜单粘贴
   都能覆盖到（后者只是少数环境下的异步兜底，见 useTableClipboard）。
   只接管纯文本；图片 / 文件等其它内容交回浏览器默认行为。
   ============================================================ */

import { useEffect } from 'react'

export function useTablePaste({
  selected,
  primary,
  editing,
  cursor,
  anchor,
  selection,
  rows,
  cols,
  cells,
  tableId,
  onPasteCells,
  wrapRef,
  applyPastedText,
}) {
  useEffect(() => {
    if (!selected) return undefined

    const onPaste = (e) => {
      if (editing || !cursor) return // 编辑中交给输入框自己粘，无活动格则不管

      const target = e.target
      // 其它输入框 / 可编辑区域的粘贴照旧走原生行为
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return
      }
      // 与 keydown 同一套判定：焦点在表格内，或焦点落在 body 且本表是主选中表
      const inTable = wrapRef.current?.contains(target)
      if (
        !inTable &&
        (target !== document.body || !primary) &&
        target !== document.documentElement
      ) {
        return
      }

      const text = e.clipboardData?.getData('text/plain')
      if (!text) return // 图片 / 文件等非文本内容不接管

      e.preventDefault()
      e.stopPropagation()
      applyPastedText(text) // 内部会标记「已由 paste 事件处理」，抑制 keydown 的异步兜底
    }

    window.addEventListener('paste', onPaste, true)
    return () => window.removeEventListener('paste', onPaste, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, editing, cursor, anchor, selection, rows, cols, cells, tableId, onPasteCells, primary])
}
