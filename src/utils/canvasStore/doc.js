/* ============================================================
   画布存档读写与变更广播
   ------------------------------------------------------------
   · 按任务维度存取画布内容（节点 / 连线 / 表格）与视图（平移 + 缩放）
   · 同标签页用自定义事件广播，跨标签页用 storage 事件广播
     —— 画布页改动后，任务列表缩略图的结构预览实时跟上（仅结构，不含文本）
   · 视图（view）变化默认「静默」落盘：不进广播，避免拖动画布时
     把任务列表缩略图连带重渲染
   ============================================================ */

import { buildCanvas } from '../../constants/tasks'
import { CHANGE_EVENT, EMPTY_CANVAS, SAVE_DELAY, VERSION, canvasKey } from './constants'
import { memoryFallback, storage } from './storage'
import { normalizeDoc, normalizeView } from './normalize'

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
