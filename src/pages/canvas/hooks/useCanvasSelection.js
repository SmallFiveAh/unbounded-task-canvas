/* ============================================================
   画布选中态 + 节点编辑态
   ------------------------------------------------------------
   · selectedIds：多选集合；selectedId：主选中（多选里最后点中的那个）
   · editingId / draft：正在双击编辑的节点与它的草稿文案
   · 本 hook 只关心「谁是选中的」，不碰节点/表格数据本身；
     需要连带改数据的动作（删除、新增）由调用方组合。
   ============================================================ */

import { useCallback, useState } from 'react'

export function useCanvasSelection() {
  const [selectedId, setSelectedId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')

  // 只选中一个元素（新建 / 单击表格 / 进入编辑都用它）
  const selectOnly = useCallback((id) => {
    setSelectedIds([id])
    setSelectedId(id)
  }, [])

  // 批量选中（框选）：主选中落在最后一个命中的元素上
  const selectMany = useCallback((ids) => {
    setSelectedIds(ids)
    setSelectedId(ids[ids.length - 1] ?? null)
  }, [])

  // 取消全部选中（点空白 / 按 Esc）：同时退出节点编辑
  const clearSelection = useCallback(() => {
    setSelectedId(null)
    setSelectedIds([])
    setEditingId(null)
  }, [])

  // 节点被删除：从选区里摘掉它，并清空主选中与编辑态
  const removeNodeFromSelection = useCallback((id) => {
    setSelectedIds((ids) => ids.filter((x) => x !== id))
    setSelectedId(null)
    setEditingId(null)
  }, [])

  // 表格被删除：从选区里摘掉它，并清空主选中
  const removeTableFromSelection = useCallback((id) => {
    setSelectedIds((ids) => ids.filter((x) => x !== id))
    setSelectedId(null)
  }, [])

  // 双击节点进入编辑：选中它，并把原文字放进草稿
  const startEditNode = useCallback((node) => {
    setSelectedIds([node.id])
    setSelectedId(node.id)
    setEditingId(node.id)
    setDraft(node.text)
  }, [])

  const stopEditing = useCallback(() => setEditingId(null), [])

  return {
    selectedId,
    selectedIds,
    setSelectedId,
    setSelectedIds,
    editingId,
    setEditingId,
    stopEditing,
    draft,
    setDraft,
    selectOnly,
    selectMany,
    clearSelection,
    removeNodeFromSelection,
    removeTableFromSelection,
    startEditNode,
  }
}
