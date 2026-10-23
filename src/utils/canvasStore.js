/* ============================================================
   无限画布数据持久化（localStorage）
   ------------------------------------------------------------
   · 按任务维度存取画布内容（节点 / 连线 / 表格）与视图（平移 + 缩放）
   · 同标签页用自定义事件广播，跨标签页用 storage 事件广播
     —— 画布页改动后，任务列表缩略图的结构预览实时跟上（仅结构，不含文本）
   · 视图（view）变化默认「静默」落盘：不进广播，避免拖动画布时
     把任务列表缩略图连带重渲染
   · 首次打开任务时用常量数据生成种子画布（seed），之后以存储为准
   ============================================================ */

import { buildCanvas } from '../constants/tasks'
import { isNoteKind, LEGACY_NOTE_DEFAULT_TEXT } from '../constants/noteStyles'
import {
  TABLE_CELL_H,
  TABLE_CELL_W,
  TABLE_MAX_CELL_H,
  TABLE_MAX_CELL_W,
  TABLE_MIN_CELL_H,
  TABLE_MIN_CELL_W,
} from '../constants/canvasTable'

const KEY_PREFIX = 'unbounded-canvas:doc:'
const CHANGE_EVENT = 'unbounded-canvas:change'
const VERSION = 1

/** 画布缩放范围（画布页与存档校验共用同一套上下限） */
export const MIN_SCALE = 0.2
export const MAX_SCALE = 5

/** 拖拽时状态高频变化，写入做节流，避免每帧都碰 localStorage */
const SAVE_DELAY = 120

export const EMPTY_CANVAS = {
  version: VERSION,
  nodes: [],
  edges: [],
  tables: [],
  view: null, // 视图（平移 + 缩放），null 表示「还没有视口记忆」
  updatedAt: 0,
}

const memoryFallback = new Map()

/** localStorage 不可用（隐私模式 / 配额满）时退化为内存存储，功能不中断 */
const storage = (() => {
  try {
    const probe = '__utc_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
})()

export const canvasKey = (taskId) => `${KEY_PREFIX}${taskId}`

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

/* ---------- 数据规整：兼容损坏 / 旧版本数据 ---------- */

function normalizeNode(raw) {
  if (!raw || typeof raw.id !== 'string') return null
  if (![raw.x, raw.y, raw.w, raw.h].every(isNum)) return null
  // kind 白名单：合法便签（note-<样式id>）原样保留，其余只认 accent / muted
  const isNote = isNoteKind(raw.kind)
  const kind = isNote ? raw.kind : raw.kind === 'accent' ? 'accent' : 'muted'
  // 旧版便签的默认文案「便签」迁移为空：与新建便签一致，显示占位符
  const text = typeof raw.text === 'string' ? raw.text : ''
  const node = {
    id: raw.id,
    x: raw.x,
    y: raw.y,
    w: Math.max(40, raw.w),
    h: Math.max(24, raw.h),
    kind,
    text: isNote && text === LEGACY_NOTE_DEFAULT_TEXT ? '' : text,
  }
  // 节点高度有两个来源（见 pages/canvas/lib/noteSize.js），全部节点通用：
  // minH 是用户设定的下限，contentH 是内容实测高度，必须一起存档 ——
  // 丢了 minH，刷新后下限会被「已撑开的高度」顶替，节点再也缩不回去
  node.minH = isNum(raw.minH) ? Math.max(24, raw.minH) : node.h
  node.contentH = isNum(raw.contentH) ? Math.max(0, raw.contentH) : 0
  return node
}

/** 连线锚点：端点在元素矩形内的相对位置（∈[0,1]），缺失 / 脏数据按「无锚点」处理 */
function normalizeAnchor(raw) {
  if (!raw || !isNum(raw.rx) || !isNum(raw.ry)) return null
  return { rx: Math.min(1, Math.max(0, raw.rx)), ry: Math.min(1, Math.max(0, raw.ry)) }
}

function normalizeEdge(raw) {
  if (!raw || typeof raw.id !== 'string') return null
  if (typeof raw.from !== 'string' || typeof raw.to !== 'string') return null
  const edge = { id: raw.id, from: raw.from, to: raw.to }
  const fromAnchor = normalizeAnchor(raw.fromAnchor)
  const toAnchor = normalizeAnchor(raw.toAnchor)
  if (fromAnchor) edge.fromAnchor = fromAnchor
  if (toAnchor) edge.toAnchor = toAnchor
  return edge
}

function normalizeTable(raw) {
  if (!raw || typeof raw.id !== 'string') return null
  if (!isNum(raw.x) || !isNum(raw.y)) return null
  const rows = Math.max(1, Math.floor(raw.rows) || 1)
  const cols = Math.max(1, Math.floor(raw.cols) || 1)
  const cells = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const v = raw.cells?.[r]?.[c]
      return typeof v === 'string' ? v : ''
    }),
  )
  // 单元格尺寸：画布上拖动四角控制点可改变，缺失（老存档）时回落到设计值
  const cellW = isNum(raw.cellW)
    ? Math.min(TABLE_MAX_CELL_W, Math.max(TABLE_MIN_CELL_W, raw.cellW))
    : TABLE_CELL_W
  const cellH = isNum(raw.cellH)
    ? Math.min(TABLE_MAX_CELL_H, Math.max(TABLE_MIN_CELL_H, raw.cellH))
    : TABLE_CELL_H
  return { id: raw.id, x: raw.x, y: raw.y, rows, cols, cellW, cellH, cells }
}

/** 视图（平移偏移 + 缩放比例）：缺字段 / 脏数据一律按「无记忆」处理 */
function normalizeView(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (![raw.x, raw.y, raw.scale].every(isNum)) return null
  return {
    x: raw.x,
    y: raw.y,
    scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw.scale)),
  }
}

function normalizeDoc(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    version: VERSION,
    nodes: Array.isArray(raw.nodes) ? raw.nodes.map(normalizeNode).filter(Boolean) : [],
    edges: Array.isArray(raw.edges) ? raw.edges.map(normalizeEdge).filter(Boolean) : [],
    tables: Array.isArray(raw.tables) ? raw.tables.map(normalizeTable).filter(Boolean) : [],
    view: normalizeView(raw.view),
    updatedAt: isNum(raw.updatedAt) ? raw.updatedAt : 0,
  }
}

/* ---------- 读写 ---------- */

/** 任务初始内容（常量数据 → 世界坐标），仅在没有本地存档时使用 */
export function createSeedCanvas(task) {
  const { nodes, edges } = buildCanvas(task)
  return { ...EMPTY_CANVAS, nodes, edges, tables: [] }
}

/** 读取本地存档；没有存档返回 null */
export function readCanvas(taskId) {
  const key = canvasKey(taskId)
  try {
    const raw = storage ? storage.getItem(key) : memoryFallback.get(key)
    if (!raw) return null
    return normalizeDoc(typeof raw === 'string' ? JSON.parse(raw) : raw)
  } catch {
    return null
  }
}

/** 读取画布：优先本地存档，其次种子内容 */
export function loadCanvas(task) {
  return readCanvas(task.id) ?? createSeedCanvas(task)
}

/**
 * 写入画布并通知订阅者（含其它标签页）
 * - view 省略时沿用存档里已有的视图，避免「保存内容」把视口记忆抹掉
 * - notify=false 用于纯视图落盘：不惊动任务列表的缩略图
 */
export function writeCanvas(taskId, { nodes, edges, tables, view }, { notify: shouldNotify = true } = {}) {
  const key = canvasKey(taskId)
  let nextView = normalizeView(view)
  if (nextView === null) {
    // 没有传 view：从现有存档里沿用，保证内容保存不丢视口
    try {
      const raw = storage ? storage.getItem(key) : memoryFallback.get(key)
      nextView = raw ? normalizeView(JSON.parse(raw)?.view) : null
    } catch {
      nextView = null
    }
  }

  const doc = {
    version: VERSION,
    nodes,
    edges,
    tables,
    view: nextView,
    updatedAt: Date.now(),
  }
  const serialized = JSON.stringify(doc)
  try {
    if (storage) storage.setItem(key, serialized)
    else memoryFallback.set(key, serialized)
  } catch {
    // 配额超限：保留内存副本，界面照常工作
    memoryFallback.set(key, serialized)
  }
  if (shouldNotify) notify(taskId)
  return doc
}

function notify(taskId) {
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { taskId } }))
}

/**
 * 订阅某个任务的画布变更（同标签页 + 跨标签页）。
 * 返回取消订阅函数。
 */
export function subscribeCanvas(taskId, listener) {
  const key = canvasKey(taskId)

  const onLocalChange = (event) => {
    const changed = event.detail?.taskId
    if (changed === undefined || String(changed) === String(taskId)) listener()
  }
  const onStorage = (event) => {
    if (event.key === null || event.key === key) listener()
  }

  window.addEventListener(CHANGE_EVENT, onLocalChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onLocalChange)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * 创建节流写入器：连续变更合并为一次落盘，flush 立即写入。
 * save(snapshot, { notify }):
 * - notify=true（默认）内容变更，广播给缩略图
 * - notify=false 纯视图变更（平移 / 缩放），静默落盘
 * 同一批内只要有一次需要广播，就整体按广播处理（先内容后视图时不会丢提示）
 */
export function createSaver(taskId) {
  let timer = null
  let pending = null

  const flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!pending) return
    const { snapshot, notify: shouldNotify } = pending
    pending = null
    writeCanvas(taskId, snapshot, { notify: shouldNotify })
  }

  const save = (snapshot, { notify: shouldNotify = true } = {}) => {
    pending = { snapshot, notify: shouldNotify || pending?.notify === true }
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      flush()
    }, SAVE_DELAY)
  }

  return { save, flush }
}
