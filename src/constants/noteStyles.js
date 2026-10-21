/* ============================================================
   便签样式枚举
   ------------------------------------------------------------
   10 种便签的「样式 id + 名称」清单，两处共用：
   · NoteStylePanel   面板缩略图（按 id 选中 / 拖拽）
   · 画布节点          节点 kind = note-<样式id>，CanvasNodeItem
                      借 NoteStyles.module.css 渲染同款视觉
   颜色 / 装饰等视觉值统一放在 NoteStyles.module.css，
   这里只保留语义枚举，杜绝字符串魔法值散落。
   ============================================================ */

export const NOTE_KIND_PREFIX = 'note-'

export const NOTE_STYLES = [
  { id: 'amber', label: '经典黄' },
  { id: 'mint', label: '薄荷绿' },
  { id: 'sky', label: '天空蓝' },
  { id: 'blush', label: '樱花粉' },
  { id: 'lilac', label: '雾紫格' },
  { id: 'kraft', label: '牛皮纸' },
  { id: 'slate', label: '小黑板' },
  { id: 'tape', label: '胶带便签' },
  { id: 'pin', label: '图钉便签' },
  { id: 'grid', label: '方格纸' },
]

export const DEFAULT_NOTE_STYLE_ID = NOTE_STYLES[0].id

const NOTE_STYLE_ID_SET = new Set(NOTE_STYLES.map((s) => s.id))

/** 面板样式 id → 画布节点 kind */
export const noteKind = (styleId) => `${NOTE_KIND_PREFIX}${styleId}`

/** 画布节点 kind → 面板样式 id（非便签节点返回 null） */
export const noteStyleIdFromKind = (kind) =>
  typeof kind === 'string' && kind.startsWith(NOTE_KIND_PREFIX)
    ? kind.slice(NOTE_KIND_PREFIX.length)
    : null

/* ---------- 已选样式的本地记忆（面板关了也记得住） ---------- */

export const NOTE_STYLE_STORAGE_KEY = 'canvas.noteStyle'

/** 读取上次选中的便签样式；无存档或值非法时回退默认样式 */
export function loadStoredNoteStyleId() {
  try {
    const stored = window.localStorage.getItem(NOTE_STYLE_STORAGE_KEY)
    if (NOTE_STYLE_ID_SET.has(stored)) return stored
  } catch {
    /* 隐私模式等拿不到 localStorage：静默回退默认样式 */
  }
  return DEFAULT_NOTE_STYLE_ID
}

/** 记住本次选中的便签样式（写不进去也不影响本次会话使用） */
export function saveStoredNoteStyleId(styleId) {
  try {
    window.localStorage.setItem(NOTE_STYLE_STORAGE_KEY, styleId)
  } catch {
    /* 同上，忽略持久化失败 */
  }
}
