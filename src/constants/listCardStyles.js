/* ============================================================
   列表卡片样式枚举
   ------------------------------------------------------------
   10 种列表卡片的「样式 id + 名称」清单，供 ListCardStylePanel
   面板缩略图按 id 选中 / 展示。颜色 / 装饰等视觉值统一放在
   ListCardStyles.module.css，这里只保留语义枚举。
   ============================================================ */

export const LIST_CARD_STYLES = [
  { id: 'ivory', label: '极简白' },
  { id: 'mint', label: '薄荷绿' },
  { id: 'sky', label: '天空蓝' },
  { id: 'blush', label: '樱花粉' },
  { id: 'amber', label: '蜜橙' },
  { id: 'grape', label: '幻想紫' },
  { id: 'forest', label: '森林绿' },
  { id: 'ocean', label: '海洋青' },
  { id: 'ink', label: '水墨' },
  { id: 'night', label: '星夜' },
]

export const DEFAULT_LIST_CARD_STYLE_ID = LIST_CARD_STYLES[0].id

const LIST_CARD_STYLE_ID_SET = new Set(LIST_CARD_STYLES.map((s) => s.id))

/* ---------- 已选样式的本地记忆（面板关了也记得住） ---------- */

export const LIST_CARD_STYLE_STORAGE_KEY = 'canvas.listCardStyle'

/** 读取上次选中的列表卡片样式；无存档或值非法时回退默认样式 */
export function loadStoredListCardStyleId() {
  try {
    const stored = window.localStorage.getItem(LIST_CARD_STYLE_STORAGE_KEY)
    if (LIST_CARD_STYLE_ID_SET.has(stored)) return stored
  } catch {
    /* 隐私模式等拿不到 localStorage：静默回退默认样式 */
  }
  return DEFAULT_LIST_CARD_STYLE_ID
}

/** 记住本次选中的列表卡片样式（写不进去也不影响本次会话使用） */
export function saveStoredListCardStyleId(styleId) {
  try {
    window.localStorage.setItem(LIST_CARD_STYLE_STORAGE_KEY, styleId)
  } catch {
    /* 同上，忽略持久化失败 */
  }
}
