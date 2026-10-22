import { memo, useEffect, useRef } from 'react'
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
  onNodeSizeChange,
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

  // 便签高度自适应：节点容器 height:auto，由内容撑开；
  // ResizeObserver 把实测高度回写 store（node.h 是连线锚点 /
  // 选中框 / 缩略图的几何来源），实测与已落库值一致时不触发更新，
  // 避免「测量 → 回写 → 再测量」的抖动循环
  const nodeRef = useRef(null)
  // node.h 经 ref 读取：effect 只依赖节点身份，打字引起的高度变化
  // 全部走测量回调，不重建 ResizeObserver
  const nodeHRef = useRef(node.h)
  useEffect(() => {
    nodeHRef.current = node.h
  }, [node.h])

  useEffect(() => {
    if (!isNote) return undefined
    const el = nodeRef.current
    if (!el) return undefined
    const syncHeight = () => {
      // 取整比较：亚像素差异（缩放、字体度量）不落库，防止高频抖动
      const measured = Math.ceil(el.offsetHeight)
      if (Math.abs(measured - nodeHRef.current) >= 1) {
        onNodeSizeChange(node.id, { h: measured })
      }
    }
    const observer = new ResizeObserver(syncHeight)
    observer.observe(el)
    return () => observer.disconnect()
  }, [isNote, node.id, onNodeSizeChange])

  // 编辑态 textarea 自动增高：height:auto 后由 scrollHeight 决定实际高度，
  // 与展示态 span 的换行行为一致（排版属性两态共用一套，见 module.css 注释）
  const inputRef = useRef(null)
  useEffect(() => {
    if (!isNote || !editing) return
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [isNote, editing, draft])
  return (
    <div
      ref={nodeRef}
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
        // 便签：高度交给内容撑开（minHeight 兜住用户手动拉大的下限）；
        // 普通节点：仍由 store 的固定 h 决定
        height: isNote ? 'auto' : node.h,
        minHeight: isNote ? node.h : undefined,
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
          ref={inputRef}
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
  onNodeSizeChange: PropTypes.func.isRequired,
}

export default memo(CanvasNodeItem)
