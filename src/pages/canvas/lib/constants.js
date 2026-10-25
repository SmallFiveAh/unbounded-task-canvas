/* ============================================================
   无限画布的视觉 / 交互常量（均为世界坐标设计值）
   ------------------------------------------------------------
   网格、节点默认尺寸、缩放节点时的下限、保存提示停留时长。
   需要随缩放换算的值不在这里（见 geometry.js 与 canvasRadius.js）。
   ============================================================ */

export const GRID_FINE = 24 // 细网格（世界坐标）
export const GRID_MAJOR = 120 // 主网格

export const NODE_W = 176
export const NODE_H = 76

export const NOTE_W = 200 // 便签节点默认宽度（世界坐标）
export const NOTE_H = 200 // 便签节点默认高度（世界坐标）

export const CARD_W = 240 // 卡片节点默认宽度（世界坐标）：比便签宽扁，贴合卡片比例
export const CARD_H = 180 // 卡片节点默认高度（世界坐标）
export const CARD_PLACEHOLDER = '内容...' // 卡片正文为空时展示的占位文案（仅展示，不落库）
export const CARD_TITLE_PLACEHOLDER = '标题...' // 卡片标题为空时编辑框内的占位文案（仅展示，不落库）

export const LIST_CARD_W = 240 // 列表卡片默认宽度（世界坐标）：与卡片同宽，纵向排待办项
export const LIST_CARD_H = 152 // 列表卡片默认高度（世界坐标）：标题带 + 三行待办贴合内容，留一行余量
export const LIST_CARD_TITLE_PLACEHOLDER = '待办清单...' // 列表卡片标题为空时（展示态与编辑态共用）的占位文案（仅展示，不落库）
export const LIST_CARD_ITEM_PLACEHOLDER = '添加待办...' // 末尾输入位空行的占位文案（仅展示，不落库）

export const NOTE_DEFAULT_TEXT = '' // 新便签的初始内容：留空，画布上显示占位符
export const NOTE_PLACEHOLDER = '便签...' // 便签内容为空时展示的占位文案（仅展示，不落库）
export const NODE_PLACEHOLDER = '默认节点...' // 普通节点内容为空时展示的占位文案（仅展示，不落库）
export const NODE_RADIUS = 8 // 节点圆角（世界坐标设计值，缩小时会自动补偿）

export const NODE_MIN_W = 96 // 缩放节点时的最小宽度
export const NODE_MIN_H = 48 // 缩放节点时的最小高度

/* 连线（三次贝塞尔）：控制点沿端点外法线方向外扩，长度随两端距离自适应 */
export const EDGE_CURVE_RATIO = 0.4 // 外扩长度 = 两端距离 × 该系数
export const EDGE_CURVE_MIN = 24 // 外扩下限（世界坐标）
export const EDGE_CURVE_MAX = 160 // 外扩上限（世界坐标）
export const EDGE_TARGET_PAD = 2 // 终点裁剪到目标边框之外的距离，给实心箭头留位（世界坐标）

export const SAVED_HINT_DURATION = 5000 // 「已保存到本地」提示停留时长（ms），之后淡出

/* ---------- 节点编辑字段 ----------
   普通节点 / 便签只有正文；卡片有两个可编辑区域：
   · title  标题（封面色带内，加粗、垂直居中）
   · text   正文（下方内容区，编辑交互与便签一致）
   编辑态用 editingId + editingField 二元组定位「正在编辑哪个框」。 */
export const EDIT_FIELD_TEXT = 'text'
export const EDIT_FIELD_TITLE = 'title'

/* 列表卡片的待办行编辑字段：形如 item-<行下标>，同样落在这套
   editingId + editingField 二元组里（一行一个输入框，草稿共用 draft）。
   下标随「清空删行」会平移，但编辑是瞬态的（提交即退出），不会跨帧失效。 */
export const EDIT_FIELD_LIST_ITEM = 'item'

/** 行下标 → 编辑字段（item-<index>） */
export const listItemField = (index) => `${EDIT_FIELD_LIST_ITEM}-${index}`

/** 编辑字段 → 行下标；非待办行字段返回 null */
export function listItemIndexFromField(field) {
  if (typeof field !== 'string' || !field.startsWith(`${EDIT_FIELD_LIST_ITEM}-`)) return null
  const index = Number(field.slice(EDIT_FIELD_LIST_ITEM.length + 1))
  return Number.isInteger(index) && index >= 0 ? index : null
}
