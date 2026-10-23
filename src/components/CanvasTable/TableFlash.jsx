import PropTypes from 'prop-types'
import { TABLE_ROW_HEADER_W } from '../../constants/canvasTable'
import styles from './CanvasTable.module.css'

/**
 * 复制 / 剪切反馈覆盖层：选区四周一圈流动虚线「蚂蚁线」
 * （表格 overflow:hidden，只能画在里面）
 */
export default function TableFlash({ flash, cellW, cellH }) {
  if (!flash) return null

  // 虚线框精确包住被复制的矩形选区。
  // rect 内缩 0.5px 让 1px 描边居中在网格线上，虚线走一圈选区边界。
  const boxW = (flash.c2 - flash.c1 + 1) * cellW
  const boxH = (flash.r2 - flash.r1 + 1) * cellH

  return (
    <svg
      className={styles.ants}
      style={{
        left: TABLE_ROW_HEADER_W + flash.c1 * cellW,
        top: cellH + flash.r1 * cellH,
        width: boxW,
        height: boxH,
      }}
      aria-hidden="true"
    >
      <rect
        className={styles.antsRect}
        x="0.5"
        y="0.5"
        width={boxW - 1}
        height={boxH - 1}
      />
    </svg>
  )
}

TableFlash.propTypes = {
  flash: PropTypes.shape({
    r1: PropTypes.number.isRequired,
    r2: PropTypes.number.isRequired,
    c1: PropTypes.number.isRequired,
    c2: PropTypes.number.isRequired,
  }),
  cellW: PropTypes.number.isRequired,
  cellH: PropTypes.number.isRequired,
}
