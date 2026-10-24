import { useRef } from 'react'
import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'
import { MIND_MAP_STYLES } from '../../constants/mindMapStyles'
import visualStyles from '../MindMapStyles/MindMapStyles.module.css'
import { usePanelDismiss } from './usePanelDismiss'
import styles from './MindMapStylePanel.module.css'

/**
 * 思维导图样式面板 —— 跟随左侧工具栏弹出
 * ------------------------------------------------------------
 * 布局 / 定位 / 关闭交互与「便签」面板同款：
 * · 水平在工具栏右侧，垂直以工具栏中间为锚点
 * · 点击缩略图选中样式（外部记忆，关面板不丢）；
 *   选中效果只有样式本身的高亮描边，不附加对勾等元素
 * · 点击面板外部 / Esc 关闭；窗口尺寸变化自动跟随重定位
 *
 * 注意：渲染期读取 anchorRef / toolbarRef 做定位沿用
 * 便签面板的既有设计（面板打开当帧就要拿到锚点），
 * 同样做定向豁免。
 */
/* eslint-disable react-hooks/refs */
export default function MindMapStylePanel({
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
      aria-label="思维导图样式"
      tabIndex={-1}
    >
      <div className={styles.grid}>
        {MIND_MAP_STYLES.map((styleItem) => (
          <MindMapSwatch
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

/** 单个样式缩略图：迷你导图预览（根节点 — 三条弧线分支 — 文本条） */
function MindMapSwatch({ styleItem, selected, onSelect }) {
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
      <svg className={styles.thumb} viewBox="0 0 96 56" aria-hidden="true" focusable="false">
        {/* 三条分支：从根节点右缘出发，向右上 / 右 / 右下扇出 */}
        <path className={`${styles.branch} ${styles.branchB1}`} d="M33 28 C 45 28, 47 10, 61 10" />
        <path className={`${styles.branch} ${styles.branchB2}`} d="M33 28 L 61 28" />
        <path className={`${styles.branch} ${styles.branchB3}`} d="M33 28 C 45 28, 47 46, 61 46" />
        {/* 分支末端的文本条 */}
        <rect className={styles.bar} x="64" y="6.5" width="28" height="7" rx="3.5" />
        <rect className={styles.bar} x="64" y="24.5" width="28" height="7" rx="3.5" />
        <rect className={styles.bar} x="64" y="42.5" width="28" height="7" rx="3.5" />
        {/* 根节点：描边胶囊（最后绘制，压在分支起点之上） */}
        <rect className={styles.root} x="3" y="19" width="30" height="18" rx="9" />
      </svg>
    </button>
  )
}

MindMapSwatch.propTypes = {
  styleItem: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  selected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
}

MindMapStylePanel.propTypes = {
  open: PropTypes.bool.isRequired,
  anchorRef: PropTypes.object.isRequired,
  toolbarRef: PropTypes.object,
  selectedId: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
}
