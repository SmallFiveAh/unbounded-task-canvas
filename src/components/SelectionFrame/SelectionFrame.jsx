import { memo } from 'react'
import PropTypes from 'prop-types'
import styles from './SelectionFrame.module.css'

/**
 * 选中框 —— 画在「屏幕空间」而不是世界层里
 * ------------------------------------------------------------
 * 为什么不用节点自身的 border / box-shadow 画选中态？
 * 世界层整体被 CSS scale() 乘过，节点里的 1px 会跟着画布缩放变成 2px、5px，
 * 四角控制点也会一起放大，鼠标命中区完全失控。
 * 这里把选中框和四角控制点放到视口坐标系（外面那层不缩放的容器）里，
 * 因此：线宽恒为 1px、控制点恒为 9px，与画布缩放级别无关 —— 和 Photoshop
 * 的选区手感一致。
 *
 * 视觉规格
 * - 边框：1px 实线，信号橙（--color-accent）
 * - 控制点：9×9 正方块，面（surface）+ 1.5px 橙描边，四角各一枚，中心对准角点
 * - 悬停：控制点放大约 1.2 倍（不改变命中区）
 * - 缩放中：底部显示实时尺寸徽标
 */

const CORNERS = [
  { key: 'nw', cursor: 'nwse-resize' },
  { key: 'ne', cursor: 'nesw-resize' },
  { key: 'sw', cursor: 'nesw-resize' },
  { key: 'se', cursor: 'nwse-resize' },
]

/**
 * 四边拉线命中条：透明地贴住边框（内外各一段），光标变为十字线。
 * 两端缩进避开四角控制点 —— 角上永远优先触发缩放，边上才是拉线。
 */
const LINK_SIDES = [
  { key: 'n', className: 'linkN' },
  { key: 'e', className: 'linkE' },
  { key: 's', className: 'linkS' },
  { key: 'w', className: 'linkW' },
]

function SelectionFrame({
  left,
  top,
  width,
  height,
  radius = 8,
  showFrame = true,
  showHandles = true,
  showLinkStrips = false,
  label,
  onResizeStart,
  onLinkStart,
}) {
  return (
    <div
      className={`${styles.frame}${showFrame ? '' : ` ${styles.frameless}`}`}
      style={{
        // transform 定位：拖拽/缩放时随元素同帧移动，走合成器不触发 reflow
        transform: `translate3d(${left}px, ${top}px, 0)`,
        width,
        height,
        borderRadius: radius,
      }}
      aria-hidden="true"
    >
      {showLinkStrips &&
        LINK_SIDES.map((side) => (
          <span
            key={side.key}
            className={`${styles.linkStrip} ${styles[side.className]}`}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              // 阻止冒泡：否则视口会把这次按下当成框选 / 取消选中
              e.stopPropagation()
              e.preventDefault()
              onLinkStart?.(e)
            }}
          />
        ))}

      {showHandles &&
        CORNERS.map((corner) => (
          <span
            key={corner.key}
            data-handle={corner.key}
            className={`${styles.handle} ${styles[corner.key]}`}
            style={{ cursor: corner.cursor }}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              // 阻止冒泡：否则视口会把这次按下当成框选 / 取消选中
              e.stopPropagation()
              e.preventDefault()
              onResizeStart?.(e, corner.key)
            }}
          />
        ))}

      {label && <span className={styles.label}>{label}</span>}
    </div>
  )
}

SelectionFrame.propTypes = {
  left: PropTypes.number.isRequired,
  top: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  radius: PropTypes.number,
  // 是否绘制可见边框（思维导图节点为 false：只留拉线命中条，不加框）
  showFrame: PropTypes.bool,
  showHandles: PropTypes.bool,
  showLinkStrips: PropTypes.bool,
  label: PropTypes.string,
  onResizeStart: PropTypes.func,
  onLinkStart: PropTypes.func,
}

export default memo(SelectionFrame)
