/* ============================================================
   画布存档常量：存储 key、广播事件、版本与缩放上下限
   ============================================================ */

export const KEY_PREFIX = 'unbounded-canvas:doc:'
export const CHANGE_EVENT = 'unbounded-canvas:change'
export const VERSION = 1

/** 画布缩放范围（画布页与存档校验共用同一套上下限） */
export const MIN_SCALE = 0.2
export const MAX_SCALE = 5

/** 拖拽时状态高频变化，写入做节流，避免每帧都碰 localStorage */
export const SAVE_DELAY = 120

export const EMPTY_CANVAS = {
  version: VERSION,
  nodes: [],
  edges: [],
  tables: [],
  view: null, // 视图（平移 + 缩放），null 表示「还没有视口记忆」
  updatedAt: 0,
}

/** 任务维度存储 key（localStorage key 与内存 Map key 通用） */
export const canvasKey = (taskId) => `${KEY_PREFIX}${taskId}`
