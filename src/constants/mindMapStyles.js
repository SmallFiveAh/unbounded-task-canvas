/* ============================================================
   思维导图样式枚举
   ------------------------------------------------------------
   10 种思维导图的「样式 id + 名称」清单，供 MindMapStylePanel
   面板缩略图按 id 选中 / 展示。颜色 / 装饰等视觉值统一放在
   MindMapStyles.module.css，这里只保留语义枚举。
   ============================================================ */

export const MIND_MAP_STYLES = [
  { id: 'classic', label: '经典蓝' },
  { id: 'sakura', label: '樱花粉' },
  { id: 'mint', label: '薄荷绿' },
  { id: 'sunset', label: '落日橙' },
  { id: 'grape', label: '幻想紫' },
  { id: 'forest', label: '森林绿' },
  { id: 'ocean', label: '海洋青' },
  { id: 'ink', label: '水墨' },
  { id: 'night', label: '星空黑' },
  { id: 'candy', label: '糖果彩' },
]

export const DEFAULT_MIND_MAP_STYLE_ID = MIND_MAP_STYLES[0].id

const MIND_MAP_STYLE_ID_SET = new Set(MIND_MAP_STYLES.map((s) => s.id))

/* ---------- 已选样式的本地记忆（面板关了也记得住） ---------- */

export const MIND_MAP_STYLE_STORAGE_KEY = 'canvas.mindMapStyle'

/** 读取上次选中的思维导图样式；无存档或值非法时回退默认样式 */
export function loadStoredMindMapStyleId() {
  try {
    const stored = window.localStorage.getItem(MIND_MAP_STYLE_STORAGE_KEY)
    if (MIND_MAP_STYLE_ID_SET.has(stored)) return stored
  } catch {
    /* 隐私模式等拿不到 localStorage：静默回退默认样式 */
  }
  return DEFAULT_MIND_MAP_STYLE_ID
}

/** 记住本次选中的思维导图样式（写不进去也不影响本次会话使用） */
export function saveStoredMindMapStyleId(styleId) {
  try {
    window.localStorage.setItem(MIND_MAP_STYLE_STORAGE_KEY, styleId)
  } catch {
    /* 同上，忽略持久化失败 */
  }
}
