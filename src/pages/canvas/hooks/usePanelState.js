import { useCallback, useRef, useState } from 'react'

/* ============================================================
   通用样式面板状态
   ------------------------------------------------------------
   便签 / 思维导图 / 列表卡片 / 卡片 / 流程图五个样式面板共用同一套
   交互语义：点击左侧按钮开→关切换；点缩略图记住选中值
   （状态 + localStorage 同步落盘，面板关了、下次会话都记得住）。
   ============================================================ */

/**
 * @param {Function} loadStored 从 localStorage 读上次选中的 id（useState 惰性初始化）
 * @param {Function} saveStored 选中值落盘
 * @returns {{ open: boolean, valueId: *, btnRef: object, select: Function, toggle: Function, close: Function }}
 */
export function usePanelState({ loadStored, saveStored }) {
  const [open, setOpen] = useState(false)
  const [valueId, setValueId] = useState(loadStored)
  const btnRef = useRef(null)

  // 选中即记住：状态 + 本地存档同步落盘
  const select = useCallback(
    (id) => {
      setValueId(id)
      saveStored(id)
    },
    [saveStored],
  )
  const toggle = useCallback(() => setOpen((o) => !o), [])
  const close = useCallback(() => setOpen(false), [])

  return { open, valueId, btnRef, select, toggle, close }
}
