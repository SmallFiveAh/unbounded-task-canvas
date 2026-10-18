import SelectionFrame from '../../../../components/SelectionFrame/SelectionFrame'
import { cornerRadius } from '../../../../utils/canvasRadius'
import styles from './CanvasSelectionLayer.module.css'

/**
 * 选中框层 + 框选矩形 —— 都画在「屏幕坐标」里
 * ------------------------------------------------------------
 * 这一层在视口坐标系中（不随世界层缩放），因此：
 * · 选中框线宽恒为 1px、控制点恒为 9px，与画布缩放级别无关
 * · 多选时每个元素各有一圈框，只有单选时才给出可拖拽的四角控制点
 * 框选矩形用的是指针的屏幕坐标（marquee），渲染时换算到视口内的相对位置。
 */
export default function CanvasSelectionLayer({
  rects,
  view,
  selectedId,
  editingId,
  resizeLabel,
  onResizeStart,
  marquee,
  viewportRef,
}) {
  return (
    <>
      {rects.map((rect) => {
        const single = rects.length === 1
        return (
          <SelectionFrame
            key={rect.id}
            left={view.x + rect.x * view.scale}
            top={view.y + rect.y * view.scale}
            width={rect.w * view.scale}
            height={rect.h * view.scale}
            radius={
              cornerRadius(rect.baseRadius, rect.w, rect.h, view.scale) * view.scale
            }
            showHandles={single && rect.id === selectedId && !editingId}
            label={single && resizeLabel ? `${resizeLabel.w} × ${resizeLabel.h}` : null}
            onResizeStart={onResizeStart}
          />
        )
      })}

      {/* 框选矩形（屏幕坐标，固定于视口） */}
      {marquee &&
        (() => {
          const r = viewportRef.current.getBoundingClientRect()
          const x1 = Math.min(marquee.x1, marquee.x2) - r.left
          const y1 = Math.min(marquee.y1, marquee.y2) - r.top
          const x2 = Math.max(marquee.x1, marquee.x2) - r.left
          const y2 = Math.max(marquee.y1, marquee.y2) - r.top
          return (
            <div
              className={styles.marquee}
              style={{
                left: `${x1}px`,
                top: `${y1}px`,
                width: `${x2 - x1}px`,
                height: `${y2 - y1}px`,
              }}
              aria-hidden="true"
            />
          )
        })()}
    </>
  )
}
