import { memo } from 'react'
import PropTypes from 'prop-types'
import { noteStyleIdFromKind, NOTE_BORDERED_STYLE_IDS } from '../../../../constants/noteStyles'
import visualStyles from '../../../../components/NoteStyles/NoteStyles.module.css'
import { cornerRadius } from '../../../../utils/canvasRadius'
import { NODE_RADIUS, NOTE_PLACEHOLDER } from '../../lib/constants'
import styles from './CanvasNodeLayer.module.css'

/**
 * 单个画布节点（memo 化）
 * ------------------------------------------------------------
 * 从 CanvasNodeLayer 拆出的展示子组件：拖拽期间只有被拖节点的
 * node 对象身份变化，其余节点因 memo 浅比较通过而整帧跳过渲染
 * （DevTools 打开时，全量重渲染的成本足以把帧预算打爆）。
 * 回调 prop 全部来自上层稳定引用，onPointerDown 在组件内部
 * 再包一层箭头函数不影响 memo 判定（比较的是上层传入的 prop）。
 */
function CanvasNodeItem({
  node,
  selected,
  primary,
  editing,
  draft,
  scale,
  onNodePointerDown,
  onStartEdit,
  onDraftChange,
  onCommitEdit,
  onCancelEdit,
}) {
  // 便签节点：kind 形如 note-<样式id>，额外挂上共享视觉类
  // （纸张底色 / 墨色 / 装饰由 NoteStyles.module.css 统一供给）
  const noteStyleId = noteStyleIdFromKind(node.kind)
  const isNote = noteStyleId !== null
  const noteVisual = visualStyles[noteStyleId || '']
  // 带边框式纸张装饰的便签（小黑板粉笔框等）：
  // 内容加内边距退到装饰边线内侧，避免文字/占位符压住虚线框
  const hasBorderDecor = NOTE_BORDERED_STYLE_IDS.has(noteStyleId)
  // 空内容便签显示占位文案（仅展示，不写入数据）
  const showPlaceholder = isNote && !node.text
  return (
    <div
      data-node-id={node.id}
      className={`${styles.node} ${styles[node.kind] || ''}${
        noteVisual ? ` ${noteVisual}` : ''
      }${isNote ? ` ${styles.noteNode}` : ''}${
        hasBorderDecor ? ` ${styles.noteFramed}` : ''
      }${selected ? ` ${styles.selected}` : ''}${primary ? ` ${styles.primary}` : ''}`}
      style={{
        // 用 transform 定位而不是 left/top：拖拽每帧只动 x/y，
        // transform 走合成器，跳过整层 reflow + 重绘（box-shadow 很贵）
        transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
        width: node.w,
        height: node.h,
        // 圆角随缩放补偿：缩小时至少保留 3.5 个屏幕像素，避免「看起来是直角」
        borderRadius: cornerRadius(NODE_RADIUS, node.w, node.h, scale),
      }}
      onPointerDown={(e) => onNodePointerDown(e, node)}
      // move / up 不挂在这里：按下时指针捕获在节点上，事件会冒泡到视口，
      // 由 useViewportPointer 统一收口（挂两遍会把每次 move 跑两遍）
      onDoubleClick={(e) => {
        e.stopPropagation()
        onStartEdit(node)
      }}
    >
      {editing ? (
        <textarea
          className={styles.nodeInput}
          value={draft}
          placeholder={isNote ? NOTE_PLACEHOLDER : undefined}
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
        <span
          className={`${styles.nodeText}${
            showPlaceholder ? ` ${styles.nodeTextPlaceholder}` : ''
          }`}
        >
          {showPlaceholder ? NOTE_PLACEHOLDER : node.text}
        </span>
      )}
    </div>
  )
}

CanvasNodeItem.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.string.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    w: PropTypes.number.isRequired,
    h: PropTypes.number.isRequired,
    kind: PropTypes.string.isRequired,
    text: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool.isRequired,
  primary: PropTypes.bool.isRequired,
  editing: PropTypes.bool.isRequired,
  draft: PropTypes.string,
  scale: PropTypes.number.isRequired,
  onNodePointerDown: PropTypes.func.isRequired,
  onStartEdit: PropTypes.func.isRequired,
  onDraftChange: PropTypes.func.isRequired,
  onCommitEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
}

export default memo(CanvasNodeItem)
