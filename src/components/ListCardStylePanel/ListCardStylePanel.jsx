import { useRef } from 'react'
import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'
import { LIST_CARD_STYLES } from '../../constants/listCardStyles'
import visualStyles from '../ListCardStyles/ListCardStyles.module.css'
import { usePanelDismiss } from '../MindMapStylePanel/usePanelDismiss'
import styles from './ListCardStylePanel.module.css'

/**
 * 列表卡片样式面板 —— 跟随左侧工具栏弹出
 * ------------------------------------------------------------
 * 布局 / 定位 / 关闭交互与「便签」面板同款：
 * · 水平在工具栏右侧，垂直以工具栏中间为锚点
 * · 点击缩略图选中样式（localStorage 记忆，关面板不丢）；
 *   选中效果只有样式本身的高亮描边，不附加对勾等元素
 * · 按住缩略图可直接拖到画布创建节点（拖拽逻辑由
 *   useListCardDragCreate 接管，onPointerDown 即交接），拖拽中面板保持可见
 * · 点击面板外部 / Esc 关闭；窗口尺寸变化自动跟随重定位
 *
 * 注意：渲染期读取 anchorRef / toolbarRef 做定位沿用
 * 便签面板的既有设计（面板打开当帧就要拿到锚点），
 * 同样做定向豁免。
 */
/* eslint-disable react-hooks/refs */
export default function ListCardStylePanel({
  open,
  anchorRef,
  toolbarRef,
  selectedId,
  onSelect,
  onClose,
  onSwatchPress,
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
      aria-label="列表卡片样式"
      tabIndex={-1}
    >
      <div className={styles.grid}>
        {LIST_CARD_STYLES.map((styleItem) => (
          <ListCardSwatch
            key={styleItem.id}
            styleItem={styleItem}
            selected={styleItem.id === selectedId}
            onSelect={onSelect}
            onSwatchPress={onSwatchPress}
          />
        ))}
      </div>
    </div>,
    document.body,
  )
}

/** 单个样式缩略图：迷你待办清单（标题条 + 勾选框 + 文本条） */
function ListCardSwatch({ styleItem, selected, onSelect, onSwatchPress }) {
  return (
    <button
      type="button"
      className={`${styles.swatch} ${visualStyles[styleItem.id]}${
        selected ? ` ${styles.selected}` : ''
      }`}
      onPointerDown={(e) => onSwatchPress(e, styleItem.id)}
      onClick={(e) => {
        // 指针点击已由 onSwatchPress → useListCardDragCreate 在 pointerup 处理；
        // 这里只响应键盘激活的 click（detail === 0），避免重复选中
        if (e.detail === 0) onSelect(styleItem.id)
      }}
      aria-pressed={selected}
      aria-label={styleItem.label}
      title={styleItem.label}
    >
      <svg className={styles.thumb} viewBox="0 0 96 56" aria-hidden="true" focusable="false">
        {/* 标题条 */}
        <rect className={styles.title} x="10" y="8" width="44" height="7" rx="3.5" />
        {/* 三行待办：勾选框 + 文本条（第一行已勾选，文本条压淡表示完成） */}
        <rect className={styles.boxDone} x="10" y="22" width="8" height="8" rx="2" />
        <path className={styles.check} d="M12 26 l2 2 l4 -4" />
        <rect className={styles.barDone} x="24" y="23.5" width="48" height="5" rx="2.5" />
        <rect className={styles.box} x="10" y="34" width="8" height="8" rx="2" />
        <rect className={styles.bar} x="24" y="35.5" width="40" height="5" rx="2.5" />
        <rect className={styles.box} x="10" y="46" width="8" height="8" rx="2" />
        <rect className={styles.bar} x="24" y="47.5" width="44" height="5" rx="2.5" />
      </svg>
    </button>
  )
}

ListCardSwatch.propTypes = {
  styleItem: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  selected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onSwatchPress: PropTypes.func.isRequired,
}

ListCardStylePanel.propTypes = {
  open: PropTypes.bool.isRequired,
  anchorRef: PropTypes.object.isRequired,
  toolbarRef: PropTypes.object,
  selectedId: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSwatchPress: PropTypes.func.isRequired,
}
