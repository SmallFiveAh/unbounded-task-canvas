import PropTypes from 'prop-types'
import {
  NOTE_H,
  NOTE_PLACEHOLDER,
  NOTE_W,
  NODE_RADIUS,
} from '../../pages/canvas/lib/constants'
import nodeStyles from '../../pages/canvas/components/CanvasNodeLayer/CanvasNodeLayer.module.css'
import { cornerRadius } from '../../utils/canvasRadius'
import visualStyles from '../NoteStyles/NoteStyles.module.css'
import styles from './NoteDragGhost.module.css'

/**
 * 便签拖拽幽灵 —— 按住便签按钮 / 面板缩略图拖动时的预览
 * ------------------------------------------------------------
 * 视觉直接复用画布节点的样式类（node + noteNode + 便签样式 + selected）：
 * 纸张底色、装饰、内边距、字体、圆角、投影全部与落库节点同源，
 * 不再单独维护一套「幽灵样式」。
 *
 * 尺寸按当前视口 scale 缩放：画布世界层整体被 scale() 缩放过，
 * 真实便签的屏幕尺寸是 NOTE_W × scale；幽灵用同样的比例变换，
 * 拖拽过程中看到的大小、文字与松手后生成的节点完全一致。
 *
 * 位置仍以光标为中心（translate(-50%, -50%)），不响应任何指针事件。
 */
function NoteDragGhost({ ghost, scale }) {
  if (!ghost) return null
  return (
    <div
      className={`${styles.ghost} ${nodeStyles.node} ${nodeStyles.noteNode} ${
        nodeStyles.selected
      } ${visualStyles[ghost.styleId] || ''}`}
      style={{
        position: 'fixed',
        left: ghost.x,
        top: ghost.y,
        zIndex: 300,
        width: NOTE_W,
        height: NOTE_H,
        // 与 CanvasNodeItem 使用同一套圆角补偿（世界坐标 → 屏幕像素）
        borderRadius: cornerRadius(NODE_RADIUS, NOTE_W, NOTE_H, scale),
        // 先按视口比例缩放，再按自身尺寸居中到光标
        transform: `translate(-50%, -50%) scale(${scale})`,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {/* 与空便签落库后一致的占位文案（不是临时写死的「便签」） */}
      <span className={`${nodeStyles.nodeText} ${nodeStyles.nodeTextPlaceholder}`}>
        {NOTE_PLACEHOLDER}
      </span>
    </div>
  )
}

NoteDragGhost.propTypes = {
  ghost: PropTypes.shape({
    styleId: PropTypes.string.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }),
  scale: PropTypes.number.isRequired,
}

export default NoteDragGhost
