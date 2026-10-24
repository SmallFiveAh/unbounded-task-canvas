import { useRef } from 'react'
import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'
import { FLOW_CHART_NODES } from '../../constants/flowchartStyles'
import { usePanelDismiss } from '../MindMapStylePanel/usePanelDismiss'
import styles from './FlowChartStylePanel.module.css'

/**
 * 流程图节点面板 —— 跟随左侧工具栏弹出
 * ------------------------------------------------------------
 * 布局 / 定位 / 关闭交互与「便签」面板同款：
 * · 水平在工具栏右侧，垂直以工具栏中间为锚点
 * · 点击缩略图选中节点（外部记忆，关面板不丢）；
 *   选中效果只有缩略图本身的高亮描边，不附加对勾等元素
 * · 点击面板外部 / Esc 关闭；窗口尺寸变化自动跟随重定位
 *
 * 注意：渲染期读取 anchorRef / toolbarRef 做定位沿用
 * 便签面板的既有设计（面板打开当帧就要拿到锚点），
 * 同样做定向豁免。
 */
/* eslint-disable react-hooks/refs */
export default function FlowChartStylePanel({
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
      aria-label="流程图节点"
      tabIndex={-1}
    >
      <div className={styles.grid}>
        {FLOW_CHART_NODES.map((node) => (
          <FlowNodeSwatch
            key={node.id}
            node={node}
            selected={node.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>,
    document.body,
  )
}

/** 单个节点缩略图：按形状枚举渲染对应的标准符号迷你图 */
function FlowNodeSwatch({ node, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`${styles.swatch}${selected ? ` ${styles.selected}` : ''}`}
      onClick={() => onSelect(node.id)}
      aria-pressed={selected}
      aria-label={node.label}
      title={node.label}
    >
      <svg className={styles.thumb} viewBox="0 0 96 56" aria-hidden="true" focusable="false">
        {renderShape(node.shape)}
      </svg>
      <span className={styles.label}>{node.label}</span>
    </button>
  )
}

/** 形状 → 标准符号：SVG 迷你图，节点名称在缩略图下方单独展示 */
function renderShape(shape) {
  switch (shape) {
    case 'terminator':
      return (
        <rect className={styles.shape} x="20" y="14" width="56" height="24" rx="12" ry="12" />
      )
    case 'process':
      return <rect className={styles.shape} x="26" y="14" width="44" height="24" />
    case 'decision':
      return <polygon className={styles.shape} points="48,10 80,28 48,46 16,28" />
    case 'inputOutput':
      return <polygon className={styles.shape} points="32,14 84,14 64,38 12,38" />
    case 'subprocess':
      return (
        <>
          <rect className={styles.shape} x="20" y="14" width="56" height="24" />
          <line className={styles.rule} x1="28" y1="14" x2="28" y2="38" />
          <line className={styles.rule} x1="68" y1="14" x2="68" y2="38" />
        </>
      )
    default:
      return null
  }
}

FlowNodeSwatch.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    shape: PropTypes.string.isRequired,
  }).isRequired,
  selected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
}

FlowChartStylePanel.propTypes = {
  open: PropTypes.bool.isRequired,
  anchorRef: PropTypes.object.isRequired,
  toolbarRef: PropTypes.object,
  selectedId: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
}
