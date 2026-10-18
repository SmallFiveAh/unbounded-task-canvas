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
export const NODE_RADIUS = 8 // 节点圆角（世界坐标设计值，缩小时会自动补偿）

export const NODE_MIN_W = 96 // 缩放节点时的最小宽度
export const NODE_MIN_H = 48 // 缩放节点时的最小高度

export const SAVED_HINT_DURATION = 5000 // 「已保存到本地」提示停留时长（ms），之后淡出
