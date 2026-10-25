import PropTypes from 'prop-types'
import {
  LIST_CARD_H,
  LIST_CARD_W,
  NODE_RADIUS,
} from '../../pages/canvas/lib/constants'
import nodeStyles from '../../pages/canvas/components/CanvasNodeLayer/CanvasNodeLayer.module.css'
import ListCardNodeFace from '../../pages/canvas/components/CanvasNodeLayer/ListCardNodeFace'
import { cornerRadius } from '../../utils/canvasRadius'
import {
  LIST_CARD_DEFAULT_TITLE,
  emptyListCardItem,
} from '../../constants/listCardStyles'
import visualStyles from '../ListCardStyles/ListCardStyles.module.css'
import styles from './ListCardDragGhost.module.css'

/**
 * 列表卡片拖拽幽灵 —— 按住列表卡片按钮 / 面板缩略图拖动时的预览
 * ------------------------------------------------------------
 * 视觉直接复用画布节点的样式类（node + listNode + 列表卡片样式类）：
 * 标题带、底色、勾选框、圆角、投影全部与落库节点同源，
 * 不再单独维护一套「幽灵样式」。

 * 尺寸按当前视口 scale 缩放：画布世界层整体被 scale() 缩放过，
 * 真实列表卡片的屏幕尺寸是 LIST_CARD_W × scale；幽灵用同样的比例变换，
 * 拖拽过程中看到的大小、内容与松手后生成的节点完全一致。
 *
 * 内容与落库后的默认内容一致（标题 + 一行输入位空行，空行显示
 * 「添加待办...」占位文案）。位置以光标为中心（translate(-50%, -50%)），
 * 不响应任何指针事件。
 */
function ListCardDragGhost({ ghost, scale }) {
  if (!ghost) return null
  return (
    <div
      className={`${styles.ghost} ${nodeStyles.node} ${nodeStyles.listNode} ${
        visualStyles[ghost.styleId] || ''
      }`}
      style={{
        position: 'fixed',
        left: ghost.x,
        top: ghost.y,
        zIndex: 300,
        width: LIST_CARD_W,
        height: LIST_CARD_H,
        // 与 CanvasNodeItem 使用同一套圆角补偿（世界坐标 → 屏幕像素）
        borderRadius: cornerRadius(NODE_RADIUS, LIST_CARD_W, LIST_CARD_H, scale),
        // 先按视口比例缩放，再按自身尺寸居中到光标
        transform: `translate(-50%, -50%) scale(${scale})`,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <ListCardNodeFace
        title={LIST_CARD_DEFAULT_TITLE}
        items={[emptyListCardItem()]}
      />
    </div>
  )
}

ListCardDragGhost.propTypes = {
  ghost: PropTypes.shape({
    styleId: PropTypes.string.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }),
  scale: PropTypes.number.isRequired,
}

export default ListCardDragGhost
