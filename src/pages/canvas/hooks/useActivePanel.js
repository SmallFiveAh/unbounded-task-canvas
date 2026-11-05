import { useCallback, useState } from 'react'
import { NO_ACTIVE_PANEL } from '../lib/panelIds'

/* ============================================================
   左侧工具栏面板组：唯一激活槽位
   ------------------------------------------------------------
   互斥激活的单一数据源。六个面板共享一个 activePanel 值，
   而不是各持一个 boolean：
   · 打开 B 时槽位被写成 B，A 自然不再是激活态（无需遍历关别人）
   · 再次点击当前面板的按钮 → 槽位清空（保留「再点一次取消」）
   · 关闭只认自己的 id，误关别人不可能发生

   所有回调身份稳定（只用函数式 setState），可以安全传给
   memo 化的按钮与面板，不会打穿浅比较。
   ============================================================ */

/**
 * @returns {{
 *   activePanel: string|null,
 *   openPanel: (panelId: string) => void,
 *   closePanel: (panelId: string) => void,
 *   togglePanel: (panelId: string) => void,
 * }}
 */
export function useActivePanel() {
  const [activePanel, setActivePanel] = useState(NO_ACTIVE_PANEL)

  // 直接占位：无论之前是哪个面板，都被这一次写入顶掉
  const openPanel = useCallback((panelId) => setActivePanel(panelId), [])

  // 只清自己：若槽位已被别的面板接手，保持现状（避免旧关闭回调误伤新面板）
  const closePanel = useCallback(
    (panelId) => setActivePanel((current) => (current === panelId ? NO_ACTIVE_PANEL : current)),
    [],
  )

  // 开→关 / 其它面板→本面板：一个函数同时表达两种语义
  const togglePanel = useCallback(
    (panelId) => setActivePanel((current) => (current === panelId ? NO_ACTIVE_PANEL : panelId)),
    [],
  )

  return { activePanel, openPanel, closePanel, togglePanel }
}
