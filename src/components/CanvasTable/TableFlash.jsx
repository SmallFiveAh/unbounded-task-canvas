import PropTypes from 'prop-types'
import { TABLE_ROW_HEADER_W } from '../../constants/canvasTable'
import { FLASH_KIND } from './constants'
import styles from './CanvasTable.module.css'

/**
 * 剪贴板反馈覆盖层
 * - 复制 / 剪切：选区四周一圈流动虚线「蚂蚁线」（SVG stroke-dashoffset 动画），常驻不消失
 * - 粘贴：选区右下角内侧的文本轻提示，1.2 秒后消失
 * （表格 overflow:hidden，只能画在里面）
 */
export default function TableFlash({ flash, cellW, cellH }) {
  if (!flash) return null

  // 复制 / 剪切：虚线框精确包住被复制的矩形选区。
  // rect 内缩 0.5px 让 1px 描边居中在网格线上，虚线走一圈选区边界。
  if (flash.kind === FLASH_KIND.COPY || flash.kind === FLASH_KIND.CUT) {
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

  // 粘贴：文本轻提示，右下角对齐落地区域末端格子，向内偏移 4px
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
  flash: PropTypes.oneOfType([
    PropTypes.shape({
      kind: PropTypes.oneOf([FLASH_KIND.COPY, FLASH_KIND.CUT]).isRequired,
      r1: PropTypes.number.isRequired,
      r2: PropTypes.number.isRequired,
      c1: PropTypes.number.isRequired,
      c2: PropTypes.number.isRequired,
    }),
    PropTypes.shape({
      kind: PropTypes.oneOf([FLASH_KIND.PASTE]).isRequired,
      text: PropTypes.string.isRequired,
      r1: PropTypes.number.isRequired,
      r2: PropTypes.number.isRequired,
      c1: PropTypes.number.isRequired,
      c2: PropTypes.number.isRequired,
    }),
  ]),
  cellW: PropTypes.number.isRequired,
  cellH: PropTypes.number.isRequired,
}
