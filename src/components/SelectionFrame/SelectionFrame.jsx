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

export default function SelectionFrame({
  left,
  top,
  width,
  height,
  radius = 8,
  showHandles = true,
  label,
  onResizeStart,
}) {
  return (
    <div
      className={styles.frame}
      style={{ left, top, width, height, borderRadius: radius }}
      aria-hidden="true"
    >
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
