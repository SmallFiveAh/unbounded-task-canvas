import { useId, useMemo } from 'react'
import PropTypes from 'prop-types'
import { useCanvasSnapshot } from '../../hooks/useCanvasSnapshot'
import { buildElementIndex, resolveEdgePath } from '../../pages/canvas/lib/edges'
import { computeLayout } from './layout'
import { NodeShape, TableShape } from './shapes'
import styles from './CanvasThumbnail.module.css'

/**
 * 任务卡片缩略图：渲染该任务无限画布的「结构预览」
 * - 数据来自 localStorage 存档（与画布页同一份），改动实时同步
 * - 节点 / 连线 / 表格的几何形态按世界坐标绘制
 * - 点阵网格画在屏幕空间（CSS 背景），不随内容坐标平移或缩放，密度恒定
 * - 出于数据保密：不渲染任何文本内容，节点文字用以横条代替
 *
 * 分工（同目录）：
 * - layout.js    包围盒 → 正方形 viewBox 的纯计算
 * - shapes.jsx   节点 / 表格的 SVG 形状（不含真实文本）
 */

/** 空画布占位：不铺点阵网格，只留空状态 */
function EmptyState() {
  return (
    <div className={styles.wrap}>
      <div className={styles.empty}>
        <i className="bi bi-inbox" aria-hidden="true"></i>
        <span className={styles.emptyText}>画布还是空的</span>
      </div>
    </div>
  )
}

/** 连线层：与画布一致的贝塞尔曲线 + 虚线 + 箭头 */
function EdgeLayer({ edgeViews, arrowId }) {
  return (
    <>
      <defs>
        <marker
          id={arrowId}
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0 L6,3 L0,6 Z" className={styles.arrow} />
        </marker>
      </defs>
      {edgeViews.map((edge) => (
        <path
          key={edge.id}
          d={edge.d}
          fill="none"
          className={styles.edge}
          markerEnd={`url(#${arrowId})`}
        />
      ))}
    </>
  )
}

EdgeLayer.propTypes = {
  edgeViews: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      d: PropTypes.string.isRequired,
    }),
  ).isRequired,
  arrowId: PropTypes.string.isRequired,
}

export default function CanvasThumbnail({ task }) {
  const { nodes, edges, tables } = useCanvasSnapshot(task)
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  const layout = useMemo(
    () => (nodes.length || tables.length ? computeLayout(nodes, tables) : null),
    [nodes, tables],
  )

  // 与画布页共用同一套连线几何：节点 + 表格统一建索引，
  // 锚点（fromAnchor / toAnchor）决定端点在元素矩形里的相对位置，
  // 三次贝塞尔曲线 + 终点裁剪到目标边框，保证缩略图与画布连线一致。
  const edgeViews = useMemo(() => {
    if (!layout) return []
    const elementIndex = buildElementIndex(nodes, tables)
    return edges
      .map((edge) => ({ id: edge.id, d: resolveEdgePath(edge, elementIndex) }))
      .filter((edge) => edge.d)
  }, [edges, nodes, tables, layout])

  if (!layout) return <EmptyState />

  const { vx, vy, side } = layout
  const arrowId = `thumb-arrow-${uid}`

  return (
    <div className={`${styles.wrap} ${styles.grid}`}>
      <svg
        className={styles.svg}
        viewBox={`${vx} ${vy} ${side} ${side}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${task.title} 的画布结构预览`}
      >
        {/* 连线层 → 表格层 → 节点层 */}
        <EdgeLayer edgeViews={edgeViews} arrowId={arrowId} />
        {tables.map((table) => (
          <TableShape key={table.id} table={table} />
        ))}
        {nodes.map((node) => (
          <NodeShape key={node.id} node={node} />
        ))}
      </svg>
    </div>
  )
}

CanvasThumbnail.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
}
