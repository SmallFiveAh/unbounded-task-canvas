import PropTypes from 'prop-types'
import {
  CARD_H,
  CARD_PLACEHOLDER,
  CARD_TITLE_PLACEHOLDER,
  CARD_W,
  NODE_RADIUS,
} from '../../pages/canvas/lib/constants'
import nodeStyles from '../../pages/canvas/components/CanvasNodeLayer/CanvasNodeLayer.module.css'
import CardNodeFace from '../../pages/canvas/components/CanvasNodeLayer/CardNodeFace'
import { cornerRadius } from '../../utils/canvasRadius'
import visualStyles from '../CardStyles/CardStyles.module.css'
import styles from './CardDragGhost.module.css'

/**
 * 卡片拖拽幽灵 —— 按住卡片按钮 / 面板缩略图拖动时的预览
 * ------------------------------------------------------------
 * 视觉直接复用画布节点的样式类（node + cardNode + 卡片样式类）：
 * 封面标题带、底色 / 纹理、圆角、投影全部与落库节点同源，
 * 不再单独维护一套「幽灵样式」。
 *
 * 尺寸按当前视口 scale 缩放：画布世界层整体被 scale() 缩放过，
 * 真实卡片的屏幕尺寸是 CARD_W × scale；幽灵用同样的比例变换，
 * 拖拽过程中看到的大小、封面与松手后生成的节点完全一致。
 *
 * 位置仍以光标为中心（translate(-50%, -50%)），不响应任何指针事件。
 */
function CardDragGhost({ ghost, scale }) {
  if (!ghost) return null
  return (
    <div
      className={`${styles.ghost} ${nodeStyles.node} ${nodeStyles.cardNode} ${
        visualStyles[ghost.styleId] || ''
      }`}
      style={{
        position: 'fixed',
        left: ghost.x,
        top: ghost.y,
        zIndex: 300,
        width: CARD_W,
        height: CARD_H,
        // 与 CanvasNodeItem 使用同一套圆角补偿（世界坐标 → 屏幕像素）
        borderRadius: cornerRadius(NODE_RADIUS, CARD_W, CARD_H, scale),
        // 先按视口比例缩放，再按自身尺寸居中到光标
        transform: `translate(-50%, -50%) scale(${scale})`,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {/* 与空卡片落库后一致：弱化「标题...」占位 + 正文占位文案（非临时写死） */}
      <CardNodeFace
        title=""
        body=""
        placeholder={CARD_PLACEHOLDER}
        titlePlaceholder={CARD_TITLE_PLACEHOLDER}
      />
    </div>
  )
}

CardDragGhost.propTypes = {
  ghost: PropTypes.shape({
    styleId: PropTypes.string.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }),
  scale: PropTypes.number.isRequired,
}

export default CardDragGhost
