import { useCallback } from 'react'

/* ============================================================
   节点编辑提交（从 CanvasPage 拆出的行为 hook）
   ------------------------------------------------------------
   · commitNodeEdit：编辑中的草稿落库并退出编辑态
   · commitEditOnPointerDown：点击画布（捕获阶段）先把正在编辑的
     草稿提交落库，避免两条绕过 blur 的路径弄丢已输入的文本
   ============================================================ */

/**
 * @param {object} doc         useCanvasDocument 返回值（commitNodeText 落库）
 * @param {object} selection   useCanvasSelection 返回值（editingId / draft / stopEditing）
 * @param {object} viewportRef 视口容器 ref（判断点击是否落在编辑框内部）
 */
export function useCommitNodeEdit({ doc, selection, viewportRef }) {
  // 节点文案落库：便签空白会清空为占位符，普通节点空白视为「不改」（见 commitNodeText）。
  // useCallback 固定身份：它是每个 memo 化节点子组件的 prop，
  // 每帧换新引用会把 memo 浅比较打穿（拖拽期间全量重渲染）
  const commitNodeEdit = useCallback(() => {
    doc.commitNodeText(selection.editingId, selection.draft)
    selection.stopEditing()
  }, [doc.commitNodeText, selection.editingId, selection.draft, selection.stopEditing])

  // 点击画布（捕获阶段）先把正在编辑的草稿提交落库。
  // 不能只靠 textarea 的 blur：点击其他节点时 useItemDrag 的 preventDefault
  // 会拦下焦点转移（blur 不触发），框选/平移收口又在 pointerup 卸载编辑框
  // ——两条路都会绕过 blur 把已输入的文本弄丢，这里在源头统一兜底。
  const commitEditOnPointerDown = useCallback(
    (e) => {
      if (e.button !== 0 || e.nativeEvent.isComposing) return // 右键 / IME 组合输入中：交给默认流程
      if (!selection.editingId) return
      const textarea = viewportRef.current?.querySelector('textarea')
      if (textarea && textarea.contains(e.target)) return // 点在编辑框内部：光标定位，不提交
      commitNodeEdit()
    },
    [commitNodeEdit, selection.editingId, viewportRef],
  )

  return { commitNodeEdit, commitEditOnPointerDown }
}
