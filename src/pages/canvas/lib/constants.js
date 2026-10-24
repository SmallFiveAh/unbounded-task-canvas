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
