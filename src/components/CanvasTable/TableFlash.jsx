import PropTypes from 'prop-types'
import { TABLE_ROW_HEADER_W } from '../../constants/canvasTable'
import styles from './CanvasTable.module.css'

/**
 * 复制 / 剪切反馈覆盖层：选区四周一圈流动虚线「蚂蚁线」
 * （表格 overflow:hidden，只能画在里面）
 * 位置按逐列 / 逐行前缀偏移计算，与网格轨道同源，永不错位
 */
export default function TableFlash({ flash, colOffsets, rowOffsets, headerH }) {
  if (!flash) return null

  // 虚线框精确包住被复制的矩形选区。
  // rect 内缩 0.5px 让 1px 描边居中在网格线上，虚线走一圈选区边界。
  const left = TABLE_ROW_HEADER_W + colOffsets[flash.c1]
  const top = headerH + rowOffsets[flash.r1]
  const boxW = colOffsets[flash.c2 + 1] - colOffsets[flash.c1]
  const boxH = rowOffsets[flash.r2 + 1] - rowOffsets[flash.r1]

  return (
    <svg
      className={styles.ants}
      style={{ left, top, width: boxW, height: boxH }}
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
  colOffsets: PropTypes.arrayOf(PropTypes.number).isRequired,
  rowOffsets: PropTypes.arrayOf(PropTypes.number).isRequired,
  headerH: PropTypes.number.isRequired,
}
