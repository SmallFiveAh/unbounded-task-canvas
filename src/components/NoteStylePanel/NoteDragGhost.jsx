import PropTypes from 'prop-types'
import { NODE_H, NODE_W } from '../../pages/canvas/lib/constants'
import visualStyles from '../NoteStyles/NoteStyles.module.css'
import styles from './NoteDragGhost.module.css'

/**
 * 便签拖拽幽灵 —— 按住便签按钮 / 面板缩略图拖动时的预览
 * ------------------------------------------------------------
 * 一张跟真实节点同尺寸的「虚拟便签」钉在光标下方
 * （fixed 定位 + translate 居中），不响应任何指针事件；
 * 数据（styleId / 屏幕坐标）由 useNoteDragCreate 实时供给。
 */
function NoteDragGhost({ ghost }) {
  if (!ghost) return null
  return (
    <div
      className={`${styles.ghost} ${visualStyles[ghost.styleId] || ''}`}
      style={{ left: ghost.x, top: ghost.y, width: NODE_W, height: NODE_H }}
      aria-hidden="true"
    >
      <span className={styles.ghostText}>便签</span>
    </div>
  )
}

NoteDragGhost.propTypes = {
  ghost: PropTypes.shape({
    styleId: PropTypes.string.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }),
}

export default NoteDragGhost
