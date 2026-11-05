import { useCallback, useRef, useState } from 'react'

/* ============================================================
   通用样式面板状态
   ------------------------------------------------------------
   便签 / 思维导图 / 列表卡片 / 卡片 / 流程图五个样式面板共用同一套
   交互语义：点击左侧按钮开→关切换；点缩略图记住选中值
   （状态 + localStorage 同步落盘，面板关了、下次会话都记得住）。

   显隐不再自持 boolean，而是从 useActivePanel 的唯一槽位派生
   （open = activePanel === panelId）。自持 boolean 的后果是六个面板
   各存一份开关、彼此不可见，点 B 时 A 没人负责关，按钮就会同时点亮。
   ============================================================ */

/**
 * @param {object} params
 * @param {string} params.panelId   本面板在 PANEL_ID 中的标识
 * @param {string|null} params.activePanel 当前唯一激活的面板
 * @param {(id: string) => void} params.togglePanel 开 / 关指定面板
 * @param {(id: string) => void} params.closePanel  关闭指定面板（只认自己的 id）
 * @param {Function} params.loadStored 从 localStorage 读上次选中的 id（useState 惰性初始化）
 * @param {Function} params.saveStored 选中值落盘
 * @returns {{ open: boolean, valueId: *, btnRef: object, select: Function, toggle: Function, close: Function }}
 */
export function usePanelState({
  panelId,
  activePanel,
  togglePanel,
  closePanel,
  loadStored,
  saveStored,
}) {
  const [valueId, setValueId] = useState(loadStored)
  const btnRef = useRef(null)

  // 派生值：六个面板读同一个槽位，互斥由数据结构本身保证
  const open = activePanel === panelId

  // 选中即记住：状态 + 本地存档同步落盘
  const select = useCallback(
    (id) => {
      setValueId(id)
      saveStored(id)
    },
    [saveStored],
  )

  const toggle = useCallback(() => togglePanel(panelId), [togglePanel, panelId])
  const close = useCallback(() => closePanel(panelId), [closePanel, panelId])

  return { open, valueId, btnRef, select, toggle, close }
}
