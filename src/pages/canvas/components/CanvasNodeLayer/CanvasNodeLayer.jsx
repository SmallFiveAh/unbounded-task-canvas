import { cornerRadius } from '../../../../utils/canvasRadius'
import { NODE_RADIUS } from '../../lib/constants'
import styles from './CanvasNodeLayer.module.css'

/**
 * 世界层的「连线 + 节点」两层
 * ------------------------------------------------------------
 * 连线层是 1×1 但允许溢出绘制的 svg，坐标即世界坐标；
 * 节点层按世界坐标绝对定位，圆角随缩放补偿（缩小时仍看得出圆角）。
 * 只负责画：拖拽 / 选中 / 编辑的事件都由 CanvasPage 传入。
 */
export default function CanvasNodeLayer({
  nodes,
  edges,
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
  const nodeById = new Map(nodes.map((n) => [n.id, n]))

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
        </defs>
        {edges.map((edge) => {
          const from = nodeById.get(edge.from)
          const to = nodeById.get(edge.to)
          if (!from || !to) return null
          return (
            <line
              key={edge.id}
              x1={from.x + from.w / 2}
              y1={from.y + from.h / 2}
              x2={to.x + to.w / 2}
              y2={to.y + to.h / 2}
              className={styles.edge}
              markerEnd="url(#canvas-arrow)"
            />
          )
        })}
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
