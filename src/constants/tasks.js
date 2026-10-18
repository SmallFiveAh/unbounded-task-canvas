/* 任务数据：任务列表页与无限画布页共享 */

/* 画布坐标映射参数（与无限画布页一致） */
const CANVAS_FACTOR = 2.6 // 缩略图数据 → 世界坐标的放大倍数
const CANVAS_NODE_MIN_W = 176
const CANVAS_NODE_MIN_H = 56

/**
 * 将任务缩略图数据映射为画布节点与连线。
 * 任务列表缩略图与无限画布页共用，保证两处显示一致。
 */
export function buildCanvas(task) {
  const elements = task.canvasElements || []

  const nodes = elements
    .filter((el) => el.type === 'node')
    .map((el, i) => ({
      id: `n-${i}`,
      x: el.x * CANVAS_FACTOR,
      y: el.y * CANVAS_FACTOR,
      w: Math.round(Math.max(el.w * CANVAS_FACTOR, CANVAS_NODE_MIN_W)),
      h: Math.round(Math.max(el.h * CANVAS_FACTOR, CANVAS_NODE_MIN_H)),
      kind: el.color === 'accent' ? 'accent' : 'muted',
      text: i === 0 ? task.title : `节点 ${i + 1}`,
    }))

  const edges = elements
    .filter((el) => el.type === 'edge')
    .map((el, i) => ({
      id: `e-${i}`,
      from: nodes[el.from]?.id,
      to: nodes[el.to]?.id,
    }))
    .filter((edge) => edge.from && edge.to)

  return { nodes, edges }
}

export const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'work', label: '工作' },
  { key: 'personal', label: '个人' },
  { key: 'project', label: '项目' },
]

export const TASKS = [
  {
    id: '1',
    title: '产品需求分析',
    category: 'work',
    status: '进行中',
    progress: 60,
    updatedAt: '2026-10-16',
    thumbnail: 'canvas',
    canvasElements: [
      { type: 'node', x: 50, y: 40, w: 80, h: 40, color: 'accent' },
      { type: 'node', x: 180, y: 20, w: 70, h: 35, color: 'muted' },
      { type: 'node', x: 160, y: 100, w: 90, h: 45, color: 'muted' },
      { type: 'edge', from: 0, to: 1 },
      { type: 'edge', from: 0, to: 2 },
    ],
  },
  {
    id: '2',
    title: '个人学习计划',
    category: 'personal',
    status: '待办',
    progress: 0,
    updatedAt: '2026-10-15',
    thumbnail: 'empty',
    canvasElements: [],
  },
  {
    id: '3',
    title: 'Q4 项目规划',
    category: 'project',
    status: '进行中',
    progress: 35,
    updatedAt: '2026-10-14',
    thumbnail: 'canvas',
    canvasElements: [
      { type: 'node', x: 40, y: 30, w: 60, h: 30, color: 'accent' },
      { type: 'node', x: 140, y: 60, w: 50, h: 28, color: 'muted' },
      { type: 'edge', from: 0, to: 1 },
    ],
  },
  {
    id: '4',
    title: '技术方案评审',
    category: 'work',
    status: '已完成',
    progress: 100,
    updatedAt: '2026-10-13',
    thumbnail: 'empty',
    canvasElements: [],
  },
  {
    id: '5',
    title: '用户调研报告',
    category: 'project',
    status: '进行中',
    progress: 75,
    updatedAt: '2026-10-12',
    thumbnail: 'canvas',
    canvasElements: [
      { type: 'node', x: 30, y: 50, w: 75, h: 38, color: 'accent' },
      { type: 'node', x: 150, y: 25, w: 55, h: 32, color: 'muted' },
      { type: 'node', x: 130, y: 90, w: 65, h: 36, color: 'muted' },
      { type: 'edge', from: 0, to: 1 },
      { type: 'edge', from: 0, to: 2 },
    ],
  },
  {
    id: '6',
    title: '每日习惯追踪',
    category: 'personal',
    status: '待办',
    progress: 10,
    updatedAt: '2026-10-11',
    thumbnail: 'canvas',
    canvasElements: [
      { type: 'node', x: 60, y: 45, w: 85, h: 40, color: 'accent' },
    ],
  },
]
