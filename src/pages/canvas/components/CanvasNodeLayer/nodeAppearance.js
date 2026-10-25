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
import { mindStyleIdFromKind, MIND_NODE_PLACEHOLDER } from '../../../../constants/mindMap'
import cardVisualStyles from '../../../../components/CardStyles/CardStyles.module.css'
import noteVisualStyles from '../../../../components/NoteStyles/NoteStyles.module.css'
import listVisualStyles from '../../../../components/ListCardStyles/ListCardStyles.module.css'
import mindVisualStyles from '../../../../components/MindMapStyles/MindMapStyles.module.css'
import {
  CARD_PLACEHOLDER,
  EDIT_FIELD_TEXT,
  EDIT_FIELD_TITLE,
  NODE_PLACEHOLDER,
  NOTE_PLACEHOLDER,
  listItemField,
  listItemIndexFromField,
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
  // 思维导图节点：kind 形如 mind-<样式id>（--mm-* 变量与面板缩略图同一套）。
  // 导图是独立结构：视觉只是胶囊 / 文本条，容器不画底色不画框
  const mindStyleId = mindStyleIdFromKind(node.kind)
  const isMind = mindStyleId !== null
  // 普通节点（muted 及其 accent 变体）：左边缘挂竖边带作视觉抓手（.nodeBand）
  const isPlain = !isNote && !isCard && !isListCard && !isMind
  // 列表卡片的行编辑态：editingField 形如 item-<下标>，下标越界（行已被删）
  // 视为不在编辑，避免渲染出一行悬空输入框
  const editingItemIndex = editing ? listItemIndexFromField(editingField) : null
  const isEditingItem =
    editingItemIndex !== null && editingItemIndex < (node.items?.length ?? 0)
  return {
    isNote,
    isCard,
    isListCard,
    isMind,
    isPlain,
    hasBorderDecor,
    // 各类型的共享视觉类（CSS Modules 哈希类名；未知样式 id 回落空串）
    noteVisual: noteVisualStyles[noteStyleId || ''],
    cardVisual: cardVisualStyles[cardStyleId || ''],
    listVisual: listVisualStyles[listStyleId || ''],
    mindVisual: mindVisualStyles[mindStyleId || ''],
    // 空内容节点显示占位文案（仅展示，不写入数据）：便签 / 卡片 / 普通节点各有专属文案
    placeholder: isNote
      ? NOTE_PLACEHOLDER
      : isCard
        ? CARD_PLACEHOLDER
        : isMind
          ? MIND_NODE_PLACEHOLDER
          : NODE_PLACEHOLDER,
    showPlaceholder: !node.text,
    // 卡片 / 列表卡片标题带与正文区的内容（列表卡片正文区不使用 text）
    cardTitle: node.title || '',
    cardBody: node.text || '',
    // 列表卡片待办区数据（双击命中行判定用；非列表卡片为 null）
    listItems: isListCard ? node.items || [] : null,
    // 两个可编辑区域各自的激活标记：标题（封面带）/ 正文（下方内容区）/
    // 待办行（items 内的行内输入框）。行编辑不算正文编辑，
    // 否则卡片正文插槽的判定会被误触发
    isEditingTitle: editing && editingField === EDIT_FIELD_TITLE,
    isEditingText:
      editing && editingField !== EDIT_FIELD_TITLE && editingItemIndex === null,
    // 正在编辑的待办行下标（不在行编辑态时为 null）
    editingItemIndex: isEditingItem ? editingItemIndex : null,
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
    appearance.mindVisual,
    // 导图容器剥掉普通节点的底色 / 投影 / 内边距：独立结构不加框
    appearance.isMind && styles.mindNode,
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
 * @returns {string|null} 编辑字段；列表卡片空白处 / 已完成的行返回 null（不可编辑）
 */
export function resolveDoubleClickEditField(e, appearance) {
  const { isCard, isListCard } = appearance
  // 普通节点 / 便签：整卡进入正文编辑
  if (!isCard && !isListCard) return EDIT_FIELD_TEXT
  const hit = document.elementFromPoint(e.clientX, e.clientY)
  const region = hit?.closest('[data-card-region]')?.dataset.cardRegion
  // 卡片：双击封面带编辑标题、正文区编辑正文
  if (isCard) return region === 'title' ? EDIT_FIELD_TITLE : EDIT_FIELD_TEXT
  // 列表卡片：封面带编辑标题；待办区按命中行进入行编辑 ——
  // 已完成的行文本锁定（勾选即完成，删除线只读），空白处不进入编辑
  if (region === 'title') return EDIT_FIELD_TITLE
  if (region !== 'items') return null
  const row = hit?.closest('[data-list-row]')
  if (!row) return null
  const index = Number(row.dataset.listRow)
  const item = appearance.listItems?.[index]
  if (!item || item.done) return null
  return listItemField(index)
}
