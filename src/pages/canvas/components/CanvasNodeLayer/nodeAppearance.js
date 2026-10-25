/* ============================================================
   节点外观解析 —— 纯函数（不依赖 React）
   ------------------------------------------------------------
   从 CanvasNodeItem 拆出的「kind → 视觉 / 编辑态派生值」一层：
   · resolveNodeAppearance        kind 解析成样式类 / 占位文案 / 编辑标记
   · buildNodeClassName           容器 className 拼装（样式类全在此汇合）
   · resolveDoubleClickEditField  双击命中坐标 → 编辑字段（title / text / null）
   全部是渲染期纯计算（除双击的 DOM 命中读取），不持有状态，
   供 memo 化的 CanvasNodeItem 每帧调用（查表成本可忽略）。
   ============================================================ */

import { cardStyleIdFromKind } from '../../../../constants/cardStyles'
import { noteStyleIdFromKind, NOTE_BORDERED_STYLE_IDS } from '../../../../constants/noteStyles'
import { listCardStyleIdFromKind } from '../../../../constants/listCardStyles'
import cardVisualStyles from '../../../../components/CardStyles/CardStyles.module.css'
import noteVisualStyles from '../../../../components/NoteStyles/NoteStyles.module.css'
import listVisualStyles from '../../../../components/ListCardStyles/ListCardStyles.module.css'
import {
  CARD_PLACEHOLDER,
  EDIT_FIELD_TEXT,
  EDIT_FIELD_TITLE,
  NODE_PLACEHOLDER,
  NOTE_PLACEHOLDER,
} from '../../lib/constants'
import styles from './CanvasNodeLayer.module.css'

/**
 * 解析节点的视觉与编辑态派生值（渲染期每次调用，纯查表）
 *
 * @param {object} node         画布节点
 * @param {boolean} editing     该节点是否处于编辑态
 * @param {string} editingField 正在编辑的字段（text / title）
 * @returns {object} appearance 外观派生值集合（字段见各注释）
 */
export function resolveNodeAppearance(node, editing, editingField) {
  // 便签节点：kind 形如 note-<样式id>（纸张底色 / 墨色 / 装饰由
  // NoteStyles.module.css 统一供给）
  const noteStyleId = noteStyleIdFromKind(node.kind)
  const isNote = noteStyleId !== null
  // 带边框式纸张装饰的便签（小黑板粉笔框等）：
  // 内容加内边距退到装饰边线内侧，避免文字/占位符压住虚线框
  const hasBorderDecor = NOTE_BORDERED_STYLE_IDS.has(noteStyleId)
  // 卡片节点：kind 形如 card-<样式id>（--c-* 变量与面板缩略图同一套）
  const cardStyleId = cardStyleIdFromKind(node.kind)
  const isCard = cardStyleId !== null
  // 列表卡片节点：kind 形如 list-<样式id>（--lc-* 变量与面板缩略图同一套）
  const listStyleId = listCardStyleIdFromKind(node.kind)
  const isListCard = listStyleId !== null
  // 普通节点（muted 及其 accent 变体）：左边缘挂竖边带作视觉抓手（.nodeBand）
  const isPlain = !isNote && !isCard && !isListCard
  return {
    isNote,
    isCard,
    isListCard,
    isPlain,
    hasBorderDecor,
    // 各类型的共享视觉类（CSS Modules 哈希类名；未知样式 id 回落空串）
    noteVisual: noteVisualStyles[noteStyleId || ''],
    cardVisual: cardVisualStyles[cardStyleId || ''],
    listVisual: listVisualStyles[listStyleId || ''],
    // 空内容节点显示占位文案（仅展示，不写入数据）：便签 / 卡片 / 普通节点各有专属文案
    placeholder: isNote ? NOTE_PLACEHOLDER : isCard ? CARD_PLACEHOLDER : NODE_PLACEHOLDER,
    showPlaceholder: !node.text,
    // 卡片 / 列表卡片标题带与正文区的内容（列表卡片正文区不使用 text）
    cardTitle: node.title || '',
    cardBody: node.text || '',
    // 两个可编辑区域各自的激活标记：标题（封面带）/ 正文（下方内容区）
    isEditingTitle: editing && editingField === EDIT_FIELD_TITLE,
    isEditingText: editing && editingField !== EDIT_FIELD_TITLE,
  }
}

/**
 * 拼装节点容器的 className：基础节点类 + 按 kind 分派的视觉类
 * + 选中 / 主选中态。未知 kind 的哈希类与关闭的布尔分支都被过滤掉，
 * 不会产生多余空格。
 */
export function buildNodeClassName(node, appearance, selected, primary) {
  return [
    styles.node,
    styles[node.kind],
    appearance.isPlain && styles.nodeBand,
    appearance.noteVisual,
    appearance.isNote && styles.noteNode,
    appearance.hasBorderDecor && styles.noteFramed,
    appearance.cardVisual,
    appearance.isCard && styles.cardNode,
    appearance.listVisual,
    appearance.isListCard && styles.listNode,
    selected && styles.selected,
    primary && styles.primary,
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * 双击 → 编辑字段判定
 * ------------------------------------------------------------
 * 卡片 / 列表卡片的 dblclick target 会被拖拽的指针捕获重定向成本容器
 * （startItemPointerDown 捕获指针，派生鼠标事件随之重定向），
 * e.target 永远不是封面带/正文区 —— 用命中坐标还原真实元素判区。
 *
 * @param {MouseEvent} e          dblclick 事件（取命中坐标）
 * @param {object} appearance     resolveNodeAppearance 返回值
 * @returns {string|null} 编辑字段；列表卡片非标题区返回 null（不进入编辑）
 */
export function resolveDoubleClickEditField(e, appearance) {
  const { isCard, isListCard } = appearance
  // 普通节点 / 便签：整卡进入正文编辑
  if (!isCard && !isListCard) return EDIT_FIELD_TEXT
  const hit = document.elementFromPoint(e.clientX, e.clientY)
  const region = hit?.closest('[data-card-region]')?.dataset.cardRegion
  // 卡片：双击封面带编辑标题、正文区编辑正文；
  // 列表卡片：只开放标题编辑，待办区不进入文本编辑（勾选走点击）
  if (isListCard && region !== 'title') return null
  return region === 'title' ? EDIT_FIELD_TITLE : EDIT_FIELD_TEXT
}
