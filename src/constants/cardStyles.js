/* ============================================================
   卡片样式枚举
   ------------------------------------------------------------
   10 种卡片的「样式 id + 名称」清单，供 CardStylePanel
   面板缩略图按 id 选中 / 展示。颜色 / 装饰等视觉值统一放在
   CardStyles.module.css，这里只保留语义枚举。
   ============================================================ */

export const CARD_STYLES = [
  { id: 'ivory', label: '极简白' },
  { id: 'sky', label: '天空蓝' },
  { id: 'mint', label: '薄荷绿' },
  { id: 'blush', label: '樱花粉' },
  { id: 'amber', label: '蜜橙' },
  { id: 'grape', label: '幻想紫' },
  { id: 'night', label: '星夜' },
  { id: 'kraft', label: '牛皮纸' },
  { id: 'glass', label: '玻璃拟态' },
  { id: 'aurora', label: '极光渐变' },
]

export const DEFAULT_CARD_STYLE_ID = CARD_STYLES[0].id

const CARD_STYLE_ID_SET = new Set(CARD_STYLES.map((s) => s.id))

/* ---------- 已选样式的本地记忆（面板关了也记得住） ---------- */

export const CARD_STYLE_STORAGE_KEY = 'canvas.cardStyle'

/** 读取上次选中的卡片样式；无存档或值非法时回退默认样式 */
export function loadStoredCardStyleId() {
  try {
    const stored = window.localStorage.getItem(CARD_STYLE_STORAGE_KEY)
    if (CARD_STYLE_ID_SET.has(stored)) return stored
  } catch {
    /* 隐私模式等拿不到 localStorage：静默回退默认样式 */
  }
  return DEFAULT_CARD_STYLE_ID
}

/** 记住本次选中的卡片样式（写不进去也不影响本次会话使用） */
export function saveStoredCardStyleId(styleId) {
  try {
    window.localStorage.setItem(CARD_STYLE_STORAGE_KEY, styleId)
  } catch {
    /* 同上，忽略持久化失败 */
  }
}
