import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'

/**
 * 面板关闭交互：Esc / 点击面板外部关闭，窗口尺寸变化时触发重定位
 * ------------------------------------------------------------
 * resize 只需强制重渲染：面板位置在渲染期按锚点矩形重算
 * （沿用便签 / 表格面板的既有设计）。
 */
export function usePanelDismiss({ open, anchorRef, panelRef, onClose }) {
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
  }, [open, onClose, anchorRef, panelRef])
}

usePanelDismiss.propTypes = {
  open: PropTypes.bool,
  anchorRef: PropTypes.object,
  panelRef: PropTypes.object,
  onClose: PropTypes.func,
}
