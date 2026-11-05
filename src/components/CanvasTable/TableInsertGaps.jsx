import { memo, useState } from 'react'
import PropTypes from 'prop-types'
import { TABLE_ROW_HEADER_W } from '../../constants/canvasTable'
import styles from './CanvasTable.module.css'

/** 插入轴：col = 上缘列界圆球（插列），row = 左缘行界圆球（插行） */
const AXIS_COL = 'col'
const AXIS_ROW = 'row'

/** 圆球命中区边长（设计 px） */
const GAP_HIT = 16
const GAP_HIT_HALF = GAP_HIT / 2
/** 视觉圆点直径（6px）/ 半径 */
const DOT_SIZE = 6
const DOT_RADIUS = DOT_SIZE / 2
/** 圆点与表格边缘的留白：圆球整体外移，不贴边 */
const GAP_TO_EDGE = 3
/** 圆球中心到边界线的距离 = 留白 + 半径，圆点内缘正好离表格 GAP_TO_EDGE px */
const DOT_CENTER_OFFSET = GAP_TO_EDGE + DOT_RADIUS

/**
 * 插入行列感应层 —— 表格 hover 时浮现的小圆球（对应交互原型需求）
 * ------------------------------------------------------------
 * - 上缘：列与列之间的每条边界一颗圆球（0..cols-1，含「行头 | 首列」边界），
 *   点击在该边界插入一列（新列左缘 = 圆球所在位置，即圆球右侧）
 * - 左缘：行与行之间的每条边界一颗圆球（0..rows-1），点击在该边界插入一行
 * - 悬停圆球时，对应位置的那条网格线整条高亮（插入位置预览，线在表格内）
 *
 * 圆球整体落在表格外：圆点内缘距表格边缘 GAP_TO_EDGE px，不贴边；
 * 命中区 16px 以圆点为中心（.table overflow:visible，表外部分可见可点）。
 * 选中框四边有条 ±3px 的拉线命中条（屏幕空间、在世界上层），
 * 圆点中心距边缘 6px，正好落在条带之外，选中表格时圆球依旧可点。
 *
 * 纯展示：行列偏移由外层算好传入，插入动作走 onInsertCol / onInsertRow。
 * 层自身不接指针事件（pointer-events: none），只有圆球可点，
 * 网格选区 / 拖拽管线完全不受影响；圆球的 pointerdown 会 stopPropagation，
 * 不会触发整表拖拽或单元格选中。
 * 点击时从 DOM 的 data-index 现读下标（而非闭包捕获），
 * 保证「点哪颗圆球就插在哪颗的位置」，杜绝热更新 / 复用渲染下的错位。
 */
function TableInsertGaps({
  cols,
  rows,
  colOffsets,
  rowOffsets,
  headerH,
  onInsertCol,
  onInsertRow,
}) {
  // 当前悬停的圆球 { axis, index }；axis 决定高亮线方向，index 决定位置
  const [hover, setHover] = useState(null)

  const dotProps = (axis) => ({
    onPointerEnter: (e) => setHover({ axis, index: Number(e.currentTarget.dataset.index) }),
    onPointerLeave: () => setHover(null),
    onPointerDown: (e) => e.stopPropagation(),
    onDoubleClick: (e) => e.stopPropagation(),
    onClick: (e) => {
      e.stopPropagation()
      const index = Number(e.currentTarget.dataset.index)
      if (axis === AXIS_COL) onInsertCol(index)
      else onInsertRow(index)
    },
  })

  return (
    <div className={styles.gapLayer}>
      {/* 悬停圆球时：插入位置对应的那条网格线整条高亮（2px 橙线，表格内） */}
      {hover?.axis === AXIS_COL && (
        <div
          className={styles.gapLineV}
          style={{ left: TABLE_ROW_HEADER_W + colOffsets[hover.index] - 1 }}
        />
      )}
      {hover?.axis === AXIS_ROW && (
        <div
          className={styles.gapLineH}
          style={{ top: headerH + rowOffsets[hover.index] - 1 }}
        />
      )}

      {/* 上缘列界圆球：index = 插入列位置（新列左缘 = 圆球所在边界） */}
      {Array.from({ length: cols }, (_, i) => (
        <button
          key={`col-${i}`}
          type="button"
          aria-label={`在第 ${i + 1} 列前插入一列`}
          className={styles.gapDot}
          data-index={i}
          style={{
            left: TABLE_ROW_HEADER_W + colOffsets[i] - GAP_HIT_HALF,
            top: -(GAP_HIT_HALF + DOT_CENTER_OFFSET),
          }}
          {...dotProps(AXIS_COL)}
        />
      ))}

      {/* 左缘行界圆球：index = 插入行位置（新行上缘 = 圆球所在边界） */}
      {Array.from({ length: rows }, (_, i) => (
        <button
          key={`row-${i}`}
          type="button"
          aria-label={`在第 ${i + 1} 行前插入一行`}
          className={styles.gapDot}
          data-index={i}
          style={{
            left: -(GAP_HIT_HALF + DOT_CENTER_OFFSET),
            top: headerH + rowOffsets[i] - GAP_HIT_HALF,
          }}
          {...dotProps(AXIS_ROW)}
        />
      ))}
    </div>
  )
}

TableInsertGaps.propTypes = {
  cols: PropTypes.number.isRequired,
  rows: PropTypes.number.isRequired,
  /** 列界前缀和（长度 cols + 1），见 sizeOffsets */
  colOffsets: PropTypes.arrayOf(PropTypes.number).isRequired,
  /** 行界前缀和（长度 rows + 1） */
  rowOffsets: PropTypes.arrayOf(PropTypes.number).isRequired,
  headerH: PropTypes.number.isRequired,
  onInsertCol: PropTypes.func.isRequired,
  onInsertRow: PropTypes.func.isRequired,
}

export default memo(TableInsertGaps)
