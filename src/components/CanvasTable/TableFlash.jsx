import PropTypes from 'prop-types'
import { TABLE_ROW_HEADER_W } from '../../constants/canvasTable'
import styles from './CanvasTable.module.css'

/**
 * 复制 / 粘贴后的轻提示：贴在选区右下角内侧
 * （表格 overflow:hidden，只能画在里面）
 */
export default function TableFlash({ flash, cellW, cellH }) {
  if (!flash) return null

  return (
    <div
      className={styles.flash}
      style={{
        left: TABLE_ROW_HEADER_W + (flash.c2 + 1) * cellW - 4,
        top: cellH + (flash.r2 + 1) * cellH - 4,
      }}
    >
      {flash.text}
    </div>
  )
}

TableFlash.propTypes = {
  flash: PropTypes.shape({
    text: PropTypes.string.isRequired,
    r1: PropTypes.number,
    r2: PropTypes.number.isRequired,
    c1: PropTypes.number,
    c2: PropTypes.number.isRequired,
  }),
  cellW: PropTypes.number.isRequired,
  cellH: PropTypes.number.isRequired,
}
