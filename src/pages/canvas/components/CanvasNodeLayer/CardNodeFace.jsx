import PropTypes from 'prop-types'
import styles from './CanvasNodeLayer.module.css'

/**
 * 卡片内容的展示面（纯展示）
 * ------------------------------------------------------------
 * 卡片视觉骨架的两个可编辑区域：
 * · 封面标题带（上，有色）：标题加粗、垂直居中 —— data-card-region="title"
 * · 正文区（下，无色）：不加粗，占位 / 排版参考便签 —— data-card-region="body"
 * 画布节点（CanvasNodeItem）与拖拽幽灵（CardDragGhost）共用，
 * 保证「拖拽中看到什么、松手就是什么」。
 *
 * 注意：这里刻意不挂任何双击处理器 —— 节点拖拽会把指针捕获在
 * 节点容器上，dblclick 的 target 会被重定向成容器（详见
 * CanvasNodeItem 的 onDoubleClick），区域判定统一在那里用
 * 命中坐标完成，本组件只负责用 data-card-region 标记区域。
 *
 * titleSlot / bodySlot 是编辑态插槽：分别用输入框取代标题 / 正文展示。
 * 空标题 / 空正文显示弱化占位文案（仅展示，不写入数据）。
 */
function CardNodeFace({ title, body, placeholder, titlePlaceholder, titleSlot, bodySlot }) {
  return (
    <div className={styles.cardInner}>
      {/* 封面标题带：标题加粗、垂直居中（flex，见 .cardCover） */}
      <span className={styles.cardCover} data-card-region="title">
        {titleSlot ?? (
          <span
            className={`${styles.cardCoverTitle}${title ? '' : ` ${styles.nodeTextPlaceholder}`}`}
          >
            {title || titlePlaceholder}
          </span>
        )}
      </span>
      {/* 正文区：空内容显示占位文案（弱化样式，与便签占位同款） */}
      {bodySlot ?? (
        <span className={styles.cardBody} data-card-region="body">
          <span
            className={`${styles.cardText}${body ? '' : ` ${styles.nodeTextPlaceholder}`}`}
          >
            {body || placeholder}
          </span>
        </span>
      )}
    </div>
  )
}

CardNodeFace.propTypes = {
  title: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
  placeholder: PropTypes.string.isRequired,
  titlePlaceholder: PropTypes.string.isRequired,
  titleSlot: PropTypes.node,
  bodySlot: PropTypes.node,
}

export default CardNodeFace
