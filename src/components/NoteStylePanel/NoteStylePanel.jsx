import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'
import { NOTE_STYLES } from '../../constants/noteStyles'
import visualStyles from '../NoteStyles/NoteStyles.module.css'
import styles from './NoteStylePanel.module.css'

/**
 * 便签样式面板 —— 跟随左侧工具栏弹出
 * ------------------------------------------------------------
 * 布局 / 定位 / 关闭交互与「插入表格」面板同款：
 * · 水平在工具栏右侧，垂直以工具栏中间为锚点
 * · 点击缩略图选中样式（外部记忆，关面板不丢）；
 *   选中效果只有样式本身的高亮描边，不附加对勾等元素
 * · 按住缩略图可直接拖到画布创建节点（拖拽逻辑由
 *   useNoteDragCreate 接管，onPointerDown 即交接），拖拽中面板保持可见
 * · 点击面板外部 / Esc 关闭；窗口尺寸变化自动跟随重定位
 *
 * 注意：渲染期读取 anchorRef / toolbarRef 做定位沿用
 * InsertTablePanel 的既有设计（面板打开当帧就要拿到锚点），
 * 同样做定向豁免。
 */
/* eslint-disable react-hooks/refs */
export default function NoteStylePanel({
  open,
  anchorRef,
  toolbarRef,
  selectedId,
  onSelect,
  onClose,
  onSwatchPress,
}) {
  const panelRef = useRef(null)
  // 用于在窗口 resize 时触发位置重算
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    const onMouseDown = (e) => {
      // 落在锚点按钮上时交给按钮自身的点击切换逻辑，避免先关后开
      if (anchorRef.current && anchorRef.current.contains(e.target)) return
      // 点击面板外部关闭
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    const onResize = () => setTick((t) => t + 1)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('resize', onResize)
    }
  }, [open, onClose, anchorRef])

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
      aria-label="便签样式"
      tabIndex={-1}
    >
      <div className={styles.grid}>
        {NOTE_STYLES.map((styleItem) => {
          const selected = styleItem.id === selectedId
          return (
            <button
              type="button"
              key={styleItem.id}
              className={`${styles.swatch} ${visualStyles[styleItem.id]}${
                selected ? ` ${styles.selected}` : ''
              }`}
              onPointerDown={(e) => onSwatchPress(e, styleItem.id)}
              onClick={(e) => {
                // 指针点击已由 onSwatchPress → useNoteDragCreate 在 pointerup 处理；
                // 这里只响应键盘激活的 click（detail === 0），避免重复选中
                if (e.detail === 0) onSelect(styleItem.id)
              }}
              aria-pressed={selected}
              title={styleItem.label}
            >
              <span className={styles.swatchText}>{styleItem.label}</span>
            </button>
          )
        })}
      </div>
    </div>,
    document.body,
  )
}

NoteStylePanel.propTypes = {
  open: PropTypes.bool.isRequired,
  anchorRef: PropTypes.object.isRequired,
  toolbarRef: PropTypes.object,
  selectedId: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSwatchPress: PropTypes.func.isRequired,
}
