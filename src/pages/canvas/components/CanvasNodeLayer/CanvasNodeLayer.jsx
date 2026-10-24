import { memo } from 'react'
import PropTypes from 'prop-types'
import CanvasNodeItem from './CanvasNodeItem'
import styles from './CanvasNodeLayer.module.css'

/**
 * 世界层的「连线 + 节点」两层
 * ------------------------------------------------------------
 * 连线层是 1×1 但允许溢出绘制的 svg，坐标即世界坐标；
 * 连线是三次贝塞尔曲线（路径由 CanvasPage 经 lib/edges.js 算好传入），
 * 末端带实心箭头标明 A → B 的方向；拖拽中的预览线用强调色区分。
 * 节点逐个交给 memo 化的 CanvasNodeItem：拖拽帧里只有被拖节点
 * 真正重渲染。只负责画：拖拽 / 选中 / 编辑的事件都由 CanvasPage 传入。
 */
function CanvasNodeLayer({
  nodes,
  edgeViews,
  previewPath,
  selectedIds,
  selectedId,
  editingId,
  editingField,
  draft,
  scale,
  onNodePointerDown,
  onStartEdit,
  onDraftChange,
  onCommitEdit,
  onCancelEdit,
  onNodeSizeChange,
}) {
  return (
    <>
      <svg className={styles.edgeLayer} aria-hidden="true">
        <defs>
          <marker
            id="canvas-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" style={{ fill: 'var(--color-muted)' }} />
          </marker>
          <marker
            id="canvas-arrow-accent"
            markerWidth="8"
            markerHeight="8"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" style={{ fill: 'var(--color-accent)' }} />
          </marker>
        </defs>
        {edgeViews.map((edge) => (
          <path
            key={edge.id}
            d={edge.d}
            fill="none"
            className={styles.edge}
            markerEnd="url(#canvas-arrow)"
          />
        ))}
        {previewPath && (
          <path
            d={previewPath}
            fill="none"
            className={styles.edgePreview}
            markerEnd="url(#canvas-arrow-accent)"
          />
        )}
      </svg>

      {nodes.map((node) => (
        <CanvasNodeItem
          key={node.id}
          node={node}
          selected={selectedIds.includes(node.id)}
          primary={node.id === selectedId}
          editing={node.id === editingId}
          // 非编辑节点的 draft 恒为空串（字符串相等 → memo 跳过）：
          // 打字时只有正在编辑的那个节点跟着重渲染
          draft={node.id === editingId ? draft : ''}
          editingField={node.id === editingId ? editingField : undefined}
          scale={scale}
          onNodePointerDown={onNodePointerDown}
          onStartEdit={onStartEdit}
          onDraftChange={onDraftChange}
          onCommitEdit={onCommitEdit}
          onCancelEdit={onCancelEdit}
          onNodeSizeChange={onNodeSizeChange}
        />
      ))}
    </>
  )
}

CanvasNodeLayer.propTypes = {
  nodes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
      w: PropTypes.number.isRequired,
      h: PropTypes.number.isRequired,
      kind: PropTypes.string.isRequired,
      text: PropTypes.string,
    }),
  ).isRequired,
  edgeViews: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      d: PropTypes.string.isRequired,
    }),
  ).isRequired,
  previewPath: PropTypes.string,
  selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedId: PropTypes.string,
  editingId: PropTypes.string,
  // 正在编辑的字段：text（正文，默认）/ title（卡片标题）
  editingField: PropTypes.string,
  draft: PropTypes.string,
  scale: PropTypes.number.isRequired,
  onNodePointerDown: PropTypes.func.isRequired,
  onStartEdit: PropTypes.func.isRequired,
  onDraftChange: PropTypes.func.isRequired,
  onCommitEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onNodeSizeChange: PropTypes.func.isRequired,
}

export default memo(CanvasNodeLayer)
