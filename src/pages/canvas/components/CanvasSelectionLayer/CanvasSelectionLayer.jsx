import { memo } from 'react'
import PropTypes from 'prop-types'
import SelectionFrame from '../../../../components/SelectionFrame/SelectionFrame'
import { cornerRadius } from '../../../../utils/canvasRadius'
import styles from './CanvasSelectionLayer.module.css'

/**
 * 选中框层 + 框选矩形 —— 都画在「屏幕坐标」里
 * ------------------------------------------------------------
 * 这一层在视口坐标系中（不随世界层缩放），因此：
 * · 选中框线宽恒为 1px、控制点恒为 9px，与画布缩放级别无关
 * · 多选时每个元素各有一圈框，只有单选时才给出可拖拽的四角控制点
 * · 非编辑态下每个选中框四边都有透明的拉线命中条：按下即开始拖出连线
 * 拉线中指针悬停的目标元素会亮出一圈高亮框，提示「松手即连接」。
 * 框选矩形用的是指针的屏幕坐标（marquee），渲染时换算到视口内的相对位置。
 */
function CanvasSelectionLayer({
  rects,
  view,
  selectedId,
  editingId,
  resizeLabel,
  onResizeStart,
  onLinkStart,
  linkTargetRect,
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
            showLinkStrips={!editingId}
            label={single && resizeLabel ? `${resizeLabel.w} × ${resizeLabel.h}` : null}
            onResizeStart={onResizeStart}
            onLinkStart={(e) => onLinkStart?.(e, rect)}
          />
        )
      })}

      {/* 拉线目标高亮框（屏幕坐标）：悬在哪个元素上，哪个元素亮框 */}
      {linkTargetRect && (
        <SelectionFrame
          left={view.x + linkTargetRect.x * view.scale}
          top={view.y + linkTargetRect.y * view.scale}
          width={linkTargetRect.w * view.scale}
          height={linkTargetRect.h * view.scale}
          radius={
            cornerRadius(
              linkTargetRect.baseRadius,
              linkTargetRect.w,
              linkTargetRect.h,
              view.scale,
            ) * view.scale
          }
          showHandles={false}
        />
      )}

      {/* 框选矩形（屏幕坐标，固定于视口）。
          渲染期读取 viewportRef 是既有设计：矩形必须与视口同帧定位，
          改走 state/effect 会引入一帧偏移（存量豁免，重构定位逻辑时一并移除） */}
      {/* eslint-disable react-hooks/refs */}
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
      {/* eslint-enable react-hooks/refs */}
    </>
  )
}

CanvasSelectionLayer.propTypes = {
  rects: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      kind: PropTypes.oneOf(['node', 'table']).isRequired,
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
      w: PropTypes.number.isRequired,
      h: PropTypes.number.isRequired,
      baseRadius: PropTypes.number.isRequired,
      // 便签专用：是否便签 / 内容实测高度
      isNote: PropTypes.bool,
      contentH: PropTypes.number,
      rows: PropTypes.number,
      cols: PropTypes.number,
    }),
  ).isRequired,
  view: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    scale: PropTypes.number.isRequired,
  }).isRequired,
  selectedId: PropTypes.string,
  editingId: PropTypes.string,
  resizeLabel: PropTypes.shape({ w: PropTypes.number.isRequired, h: PropTypes.number.isRequired }),
  onResizeStart: PropTypes.func.isRequired,
  onLinkStart: PropTypes.func.isRequired,
  linkTargetRect: PropTypes.object,
  marquee: PropTypes.shape({
    x1: PropTypes.number.isRequired,
    y1: PropTypes.number.isRequired,
    x2: PropTypes.number.isRequired,
    y2: PropTypes.number.isRequired,
  }),
  viewportRef: PropTypes.object.isRequired,
}

export default memo(CanvasSelectionLayer)
