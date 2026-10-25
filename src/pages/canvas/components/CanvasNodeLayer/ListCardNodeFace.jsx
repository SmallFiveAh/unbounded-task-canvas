import PropTypes from 'prop-types'
import { LIST_CARD_TITLE_PLACEHOLDER } from '../../lib/constants'
import styles from './CanvasNodeLayer.module.css'

/**
 * 列表卡片内容的展示面（纯展示）
 * ------------------------------------------------------------
 * 视觉骨架的两个区域：
 * · 标题带（上，有色）：复用卡片的 .cardCover / .cardCoverTitle，
 *   颜色由列表卡片样式类注入的 --lc-* 变量供给 —— data-card-region="title"
 * · 待办区（下）：每行「勾选框 + 文本」，勾选框可点击切换完成态
 *   —— data-card-region="items"
 * 画布节点（CanvasNodeItem）与拖拽幽灵（ListCardDragGhost）共用，
 * 保证「拖拽中看到什么、松手就是什么」。

 * 交互约定（与 CardNodeFace 一致）：本组件不挂双击处理器，
 * 区域判定统一在 CanvasNodeItem 的 onDoubleClick 里按命中坐标完成。
 * 勾选框是唯一的活元素：pointerdown 在这里截停（不冒泡到节点容器），
 * 否则按下会先启动节点拖拽、吞掉后续 click；点击经 onToggleItem
 * 上抛行下标，落库与持久化由上层（doc.toggleListCardItem）负责。
 *
 * titleSlot 是标题编辑态插槽：用输入框取代标题展示（复用卡片标题输入框）。
 * 幽灵传入的 onToggleItem 为空时勾选框只是静态展示（幽灵整体不可命中）。
 */
function ListCardNodeFace({ title, items, titleSlot, onToggleItem }) {
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
      {/* 待办区：空清单不渲染任何行（高度由标题带下限兜住） */}
      <span className={styles.listItems} data-card-region="items">
        {items.map((item, index) => (
          // key 用行下标：清单项不增删不排序，只有 done 取反，下标即稳定身份
          <span
            key={index}
            className={`${styles.listItem}${item.done ? ` ${styles.listItemDone}` : ''}`}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={item.done}
              aria-label={item.done ? '标记为未完成' : '标记为已完成'}
              className={styles.listCheck}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onToggleItem?.(index)
              }}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                <path className={styles.listCheckMark} d="M2.5 6.2 L5 8.6 L9.5 3.6" />
              </svg>
            </button>
            <span className={styles.listItemText}>{item.text}</span>
          </span>
        ))}
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
}

export default ListCardNodeFace
