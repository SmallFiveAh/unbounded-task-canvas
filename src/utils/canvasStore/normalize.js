/* ============================================================
   数据规整：兼容损坏 / 旧版本数据
   ------------------------------------------------------------
   · 读档一律经过 normalize*，脏数据按「无 / 默认」处理而不是报错
   · 旧版结构迁移（便签默认文案、卡片首行标题、表格尺寸数组化）都在这里
   ============================================================ */

import { isCardKind } from '../../constants/cardStyles'
import { isMindKind } from '../../constants/mindMap'
import { isNoteKind, LEGACY_NOTE_DEFAULT_TEXT } from '../../constants/noteStyles'
import { isListCardKind } from '../../constants/listCardStyles'
import {
  TABLE_CELL_H,
  TABLE_CELL_W,
  TABLE_MAX_CELL_H,
  TABLE_MAX_CELL_W,
  TABLE_MIN_CELL_H,
  TABLE_MIN_CELL_W,
} from '../../constants/canvasTable'
import { MAX_SCALE, MIN_SCALE, VERSION } from './constants'

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

/** 列表卡片待办项：脏数据按「空文本 / 未完成」处理而不是报错，条数封顶防炸 */
function normalizeListItems(raw) {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, 50).map((item) => ({
    text: typeof item?.text === 'string' ? item.text : '',
    done: item?.done === true,
  }))
}

function normalizeNode(raw) {
  if (!raw || typeof raw.id !== 'string') return null
  if (![raw.x, raw.y, raw.w, raw.h].every(isNum)) return null
  // kind 白名单：合法便签（note-<样式id>）、卡片（card-<样式id>）、
  // 列表卡片（list-<样式id>）与思维导图（mind-<样式id>）原样保留，其余只认 accent / muted
  const isNote = isNoteKind(raw.kind)
  const isCard = isCardKind(raw.kind)
  const isListCard = isListCardKind(raw.kind)
  const isMind = isMindKind(raw.kind)
  const kind =
    isNote || isCard || isListCard || isMind ? raw.kind : raw.kind === 'accent' ? 'accent' : 'muted'
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
  // 卡片节点独有标题字段：旧存档没有 title 时按「首行 = 标题」迁移
  // （该版本的卡片把首行渲染为封面标题、其余行为正文）
  if (isCard) {
    if (typeof raw.title === 'string') {
      node.title = raw.title
    } else {
      const legacy = typeof node.text === 'string' ? node.text : ''
      const breakAt = legacy.indexOf('\n')
      node.title = breakAt === -1 ? legacy : legacy.slice(0, breakAt)
      node.text = breakAt === -1 ? '' : legacy.slice(breakAt + 1)
    }
  }
  // 列表卡片独有字段：标题 + 待办项（items 里每项 { text, done }）。
  // 缺字段 / 脏数据按「空标题 / 空清单」处理，样式 id 不合法的 kind 已在上面降级。
  // 读档补齐不变量：末尾恒有一行空行（下一行的输入位），旧存档没有就补一行
  if (isListCard) {
    node.title = typeof raw.title === 'string' ? raw.title : ''
    node.items = normalizeListItems(raw.items)
    const last = node.items[node.items.length - 1]
    if (!last || last.text !== '') node.items.push({ text: '', done: false })
  }
  // 思维导图独有字段：树结构（父 id / 有序子 id 列表 / 收起态）。
  // 缺字段按「无树」兜底 —— 丢了 children，整棵子树刷新后就再也渲染不出来
  if (isMind) {
    node.parentId = typeof raw.parentId === 'string' ? raw.parentId : null
    node.children = Array.isArray(raw.children)
      ? raw.children.filter((id) => typeof id === 'string')
      : []
    node.collapsed = raw.collapsed === true
  }
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
  // 单元格尺寸：画布上可拖拽调整。老存档只有统一 cellW / cellH，读档时
  // 一律物化成逐列 / 逐行数组 + 独立表头行高，运行时只消费数组（见 canvasTable.js）
  const cellW = isNum(raw.cellW)
    ? Math.min(TABLE_MAX_CELL_W, Math.max(TABLE_MIN_CELL_W, raw.cellW))
    : TABLE_CELL_W
  const cellH = isNum(raw.cellH)
    ? Math.min(TABLE_MAX_CELL_H, Math.max(TABLE_MIN_CELL_H, raw.cellH))
    : TABLE_CELL_H
  const normalizeSizes = (list, count, fallback, min, max) =>
    Array.from({ length: count }, (_, i) => {
      const v = list?.[i]
      return isNum(v) ? Math.round(Math.min(max, Math.max(min, v))) : fallback
    })
  return {
    id: raw.id,
    x: raw.x,
    y: raw.y,
    rows,
    cols,
    cellW,
    cellH,
    headerH: isNum(raw.headerH)
      ? Math.round(Math.min(TABLE_MAX_CELL_H, Math.max(TABLE_MIN_CELL_H, raw.headerH)))
      : cellH,
    colWidths: normalizeSizes(raw.colWidths, cols, cellW, TABLE_MIN_CELL_W, TABLE_MAX_CELL_W),
    rowHeights: normalizeSizes(raw.rowHeights, rows, cellH, TABLE_MIN_CELL_H, TABLE_MAX_CELL_H),
    cells,
  }
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

export { normalizeView, normalizeDoc }
