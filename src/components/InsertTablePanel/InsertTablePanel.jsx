import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'
import styles from './InsertTablePanel.module.css'

/**
 * 表格插入面板 —— 跟随左侧工具栏弹出的网格选区
 * 参考 Word「插入 → 表格」的网格选区交互，UI 极简：仅一个网格区域。
 *
 * - 通过 toolbarRef 定位：水平在工具栏右侧，垂直以工具栏中间为锚点
 * - 点击格子选择行列；点击面板外部关闭
 * - 窗口尺寸变化时自动跟随重定位，保证响应式正常显示
 * - 当前阶段仅负责选择行列，不负责把表格加入画布
 *
 * 注意：渲染期读取 anchorRef / toolbarRef 做定位是本组件的既有设计
 * （面板打开的同一帧就需要拿到锚点位置，改走 effect 会引入一帧闪跳），
 * 因此对 react-hooks/refs 规则做定向豁免；存量问题，后续如重构定位
 * 逻辑应一并移除豁免。
 */
/* eslint-disable react-hooks/refs */
export default function InsertTablePanel({
  open,
  rows,
  cols,
  anchorRef,
  toolbarRef,
  onClose,
  onConfirm,
  onChange,
}) {
  const panelRef = useRef(null)
  // 用于在窗口 resize 时触发位置重算
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!open) return
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
      window.addEventListener('resize', onResize)
    }
  }, [open, onClose])

  if (!open || !anchorRef.current) return null

  const toolbar = toolbarRef?.current
  const MAX = 10

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
      aria-label="插入表格"
      tabIndex={-1}
    >
      <div className={styles.grid} onMouseLeave={() => onChange(0, 0)}>
        {Array.from({ length: MAX }).map((_, r) => (
          <div className={styles.row} key={r}>
            {Array.from({ length: MAX }).map((_, c) => {
              const active = r < rows && c < cols
              return (
                <button
                  type="button"
                  key={c}
                  className={`${styles.cell}${active ? ` ${styles.active}` : ''}`}
                  onMouseEnter={() => onChange(r + 1, c + 1)}
                  onClick={() => onConfirm(r + 1, c + 1)}
                  aria-label={`${r + 1} 行 × ${c + 1} 列`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>,
    document.body,
  )
}

InsertTablePanel.propTypes = {
  open: PropTypes.bool.isRequired,
  rows: PropTypes.number.isRequired,
  cols: PropTypes.number.isRequired,
  anchorRef: PropTypes.object.isRequired,
  toolbarRef: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
}