import { useRef } from 'react'
import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'
import { CARD_STYLES } from '../../constants/cardStyles'
import visualStyles from '../CardStyles/CardStyles.module.css'
import { usePanelDismiss } from '../MindMapStylePanel/usePanelDismiss'
import styles from './CardStylePanel.module.css'

/**
 * 卡片样式面板 —— 跟随左侧工具栏弹出
 * ------------------------------------------------------------
 * 布局 / 定位 / 关闭交互与「便签」面板同款：
 * · 水平在工具栏右侧，垂直以工具栏中间为锚点
 * · 点击缩略图选中样式（localStorage 记忆，关面板不丢）；
 *   选中效果只有样式本身的高亮描边，不附加对勾等元素
 * · 点击面板外部 / Esc 关闭；窗口尺寸变化自动跟随重定位
 *
 * 注意：渲染期读取 anchorRef / toolbarRef 做定位沿用
 * 便签面板的既有设计（面板打开当帧就要拿到锚点），
 * 同样做定向豁免。
 */
/* eslint-disable react-hooks/refs */
export default function CardStylePanel({
  open,
  anchorRef,
  toolbarRef,
  selectedId,
  onSelect,
  onClose,
}) {
  const panelRef = useRef(null)
  // Esc / 点击外部关闭；resize 时强制重渲染以重算位置
  usePanelDismiss({ open, anchorRef, panelRef, onClose })

  if (!open || !anchorRef.current) return null

  const toolbar = toolbarRef?.current

  // 面板跟随左侧工具栏：水平在工具栏右侧，垂直以工具栏中间为锚点
  const tb = toolbar ? toolbar.getBoundingClientRect() : anchorRef.current.getBoundingClientRect()
  const style = {
    position: 'fixed',
    top: tb.top + tb.height / 2,
    left: tb.right + 12,
    zIndex: 100,
    transform: 'translateY(-50%)',
  }

  return createPortal(
    <div
      ref={panelRef}
      className={styles.panel}
      style={style}
      role="dialog"
      aria-label="卡片样式"
      tabIndex={-1}
    >
      <div className={styles.grid}>
        {CARD_STYLES.map((styleItem) => (
          <CardSwatch
            key={styleItem.id}
            styleItem={styleItem}
            selected={styleItem.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>,
    document.body,
  )
}

/** 单个样式缩略图：迷你卡片（封面条 + 标题条 + 正文条 + 标签胶囊） */
function CardSwatch({ styleItem, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`${styles.swatch} ${visualStyles[styleItem.id]}${
        selected ? ` ${styles.selected}` : ''
      }`}
      onClick={() => onSelect(styleItem.id)}
      aria-pressed={selected}
      aria-label={styleItem.label}
      title={styleItem.label}
    >
      <span className={styles.thumb} aria-hidden="true">
        <span className={styles.cover} />
        <span className={styles.body}>
          <span className={styles.titleBar} />
          <span className={styles.line} />
          <span className={`${styles.line} ${styles.lineShort}`} />
        </span>
        <span className={styles.chipRow}>
          <span className={styles.chip} />
          <span className={`${styles.chip} ${styles.chipShort}`} />
        </span>
      </span>
    </button>
  )
}

CardSwatch.propTypes = {
  styleItem: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  selected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
}

CardStylePanel.propTypes = {
  open: PropTypes.bool.isRequired,
  anchorRef: PropTypes.object.isRequired,
  toolbarRef: PropTypes.object,
  selectedId: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
}
