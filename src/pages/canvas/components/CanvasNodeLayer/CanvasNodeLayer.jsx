import { memo } from 'react'
import PropTypes from 'prop-types'
import { cornerRadius } from '../../../../utils/canvasRadius'
import { NODE_RADIUS } from '../../lib/constants'
import styles from './CanvasNodeLayer.module.css'

/**
 * 世界层的「连线 + 节点」两层
 * ------------------------------------------------------------
 * 连线层是 1×1 但允许溢出绘制的 svg，坐标即世界坐标；
 * 连线是三次贝塞尔曲线（路径由 CanvasPage 经 lib/edges.js 算好传入），
 * 末端带实心箭头标明 A → B 的方向；拖拽中的预览线用强调色区分。
 * 节点层按世界坐标绝对定位，圆角随缩放补偿（缩小时仍看得出圆角）。
 * 只负责画：拖拽 / 选中 / 编辑的事件都由 CanvasPage 传入。
 */
function CanvasNodeLayer({
  nodes,
  edgeViews,
  previewPath,
  selectedIds,
  selectedId,
  editingId,
  draft,
  scale,
  onNodePointerDown,
  onNodePointerMove,
  onNodePointerUp,
  onStartEdit,
  onDraftChange,
  onCommitEdit,
  onCancelEdit,
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

      {nodes.map((node) => {
        const selected = selectedIds.includes(node.id)
        const primary = node.id === selectedId
        const editing = node.id === editingId
        return (
          <div
            key={node.id}
            data-node-id={node.id}
            className={`${styles.node} ${styles[node.kind]}${
              selected ? ` ${styles.selected}` : ''
            }${primary ? ` ${styles.primary}` : ''}`}
            style={{
              left: node.x,
              top: node.y,
              width: node.w,
              height: node.h,
              // 圆角随缩放补偿：缩小时至少保留 3.5 个屏幕像素，避免「看起来是直角」
              borderRadius: cornerRadius(NODE_RADIUS, node.w, node.h, scale),
            }}
            onPointerDown={(e) => onNodePointerDown(e, node)}
            onPointerMove={onNodePointerMove}
            onPointerUp={onNodePointerUp}
            onDoubleClick={(e) => {
              e.stopPropagation()
              onStartEdit(node)
            }}
          >
            {editing ? (
              <textarea
                className={styles.nodeInput}
                value={draft}
                autoFocus
                rows={2}
                onChange={(e) => onDraftChange(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onBlur={onCommitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onCommitEdit()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    onCancelEdit()
                  }
                }}
              />
            ) : (
              <span className={styles.nodeText}>{node.text}</span>
            )}
          </div>
        )
      })}
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
  draft: PropTypes.string,
  scale: PropTypes.number.isRequired,
  onNodePointerDown: PropTypes.func.isRequired,
  onNodePointerMove: PropTypes.func.isRequired,
  onNodePointerUp: PropTypes.func.isRequired,
  onStartEdit: PropTypes.func.isRequired,
  onDraftChange: PropTypes.func.isRequired,
  onCommitEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
}

export default memo(CanvasNodeLayer)
