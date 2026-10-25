import PropTypes from 'prop-types'
import { LIST_CARD_TITLE_PLACEHOLDER } from '../../lib/constants'
import ListItemRow from './ListItemRow'
import styles from './CanvasNodeLayer.module.css'

/**
 * 列表卡片内容的展示面（纯展示）
 * ------------------------------------------------------------
 * 视觉骨架的两个区域：
 * · 标题带（上，有色）：复用卡片的 .cardCover / .cardCoverTitle，
 *   颜色由列表卡片样式类注入的 --lc-* 变量供给 —— data-card-region="title"
 * · 待办区（下）：每行「勾选框 + 文本」，行级交互见 ListItemRow
 *   —— data-card-region="items"
 * 画布节点（CanvasNodeItem）与拖拽幽灵（ListCardDragGhost）共用，
 * 保证「拖拽中看到什么、松手就是什么」。

 * 交互约定（与 CardNodeFace 一致）：本组件不挂双击处理器，
 * 区域判定统一在 CanvasNodeItem 的 onDoubleClick 里按命中坐标完成
 * （标题带 → 编辑标题；待办行 → 行内编辑，已完成行锁定）。
 * 幽灵传入的回调全为空：勾选框 / 文本只是静态展示（幽灵整体不可命中）。
 *
 * items 的不变量：末尾恒有一行空行（下一行的输入位）——空行获得内容
 * 即在下方追加新空行，清空失焦的行自动删除（落库侧保证，见 useCanvasNodes）。
 *
 * titleSlot 是标题编辑态插槽：用输入框取代标题展示（复用卡片标题输入框）。
 */
function ListCardNodeFace({
  title,
  items,
  titleSlot,
  onToggleItem,
  editingItemIndex,
  draft,
  onDraftChange,
  onCommitEdit,
  onCancelEdit,
  onStartItemEdit,
}) {
  const lastIndex = items.length - 1
  return (
    <div className={styles.cardInner}>
      {/* 标题带：与卡片封面带同骨架，配色走 --lc-title / --lc-bg */}
      <span className={styles.cardCover} data-card-region="title">
        {titleSlot ?? (
          <span
            className={`${styles.cardCoverTitle}${title ? '' : ` ${styles.nodeTextPlaceholder}`}`}
          >
            {title || LIST_CARD_TITLE_PLACEHOLDER}
          </span>
        )}
      </span>
      {/* 待办区：行下标作 key —— 增删只发生在提交瞬间（编辑行此时已
          退出编辑态），其余时刻只有末尾追加，下标即稳定身份 */}
      <span className={styles.listItems} data-card-region="items">
        {items.map((item, index) => {
          // 末尾输入位空行：恒显示占位文案（幽灵同款）；画布上再由
          // onStartItemEdit 决定它是否可单击进入编辑
          const isTrailingEmpty =
            index === lastIndex && !item.text && !item.done
          return (
            <ListItemRow
              key={index}
              item={item}
              index={index}
              isEditing={index === editingItemIndex}
              showPlaceholder={isTrailingEmpty}
              clickToEdit={isTrailingEmpty && !!onStartItemEdit}
              draft={draft}
              onToggleItem={onToggleItem}
              onDraftChange={onDraftChange}
              onCommitEdit={onCommitEdit}
              onCancelEdit={onCancelEdit}
              onStartItemEdit={onStartItemEdit}
            />
          )
        })}
      </span>
    </div>
  )
}

ListCardNodeFace.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      text: PropTypes.string.isRequired,
      done: PropTypes.bool.isRequired,
    }),
  ).isRequired,
  titleSlot: PropTypes.node,
  onToggleItem: PropTypes.func,
  // 行编辑态：正在编辑的行下标（null 表示不在行编辑）
  editingItemIndex: PropTypes.number,
  draft: PropTypes.string,
  onDraftChange: PropTypes.func,
  onCommitEdit: PropTypes.func,
  onCancelEdit: PropTypes.func,
  // 单击末尾输入位空行进入编辑：(index) => void
  onStartItemEdit: PropTypes.func,
}

export default ListCardNodeFace
