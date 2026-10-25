import { memo } from 'react'
import PropTypes from 'prop-types'
import mindVisualStyles from '../../../../components/MindMapStyles/MindMapStyles.module.css'
import CanvasNodeItem from './CanvasNodeItem'
import styles from './CanvasNodeLayer.module.css'

/**
 * 世界层的「连线 + 节点」两层
 * ------------------------------------------------------------
 * 连线层是 1×1 但允许溢出绘制的 svg，坐标即世界坐标；
 * 连线是三次贝塞尔曲线（路径由 CanvasPage 经 lib/edges.js 算好传入），
 * 末端带实心箭头标明 A → B 的方向；拖拽中的预览线用强调色区分。
 * 思维导图的父 → 子分支线也画在这一层（lib/mindLayout.js 算好路径），
 * 颜色按一级分支的 --mm-b1/b2/b3 变量取色 —— 用 <g> 包一层样式类，
 * 让 CSS 变量在 svg 内部也能解析。
 * 节点逐个交给 memo 化的 CanvasNodeItem：拖拽帧里只有被拖节点
 * 真正重渲染。只负责画：拖拽 / 选中 / 编辑的事件都由 CanvasPage 传入。
 */
function CanvasNodeLayer({
  nodes,
  edgeViews,
  previewPath,
  mindBranchViews,
  selectedIds,
  selectedId,
  editingId,
  editingField,
  draft,
  scale,
  mindMetas,
  onMindMeasure,
  onToggleMindCollapse,
  onAddMindChild,
  onNodePointerDown,
  onStartEdit,
  onDraftChange,
  onCommitEdit,
  onCancelEdit,
  onNodeSizeChange,
  onToggleListItem,
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
        {/* 思维导图分支线：父 → 子的水平 S 形弧线，颜色随所属一级分支 */}
        {mindBranchViews.map((branch) => (
          <g key={branch.id} className={mindVisualStyles[branch.styleId]}>
            <path
              d={branch.d}
              fill="none"
              className={styles.mindBranch}
              style={{ stroke: `var(${branch.varName}, var(--color-border))` }}
            />
          </g>
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
          // 思维导图专属：非导图节点收到的 meta 恒为 null、回调恒为
          // 同一引用 —— memo 浅比较不受导图数据变化牵连
          mindMeta={mindMetas?.get(node.id) ?? null}
          onMindMeasure={onMindMeasure}
          onToggleMindCollapse={onToggleMindCollapse}
          onAddMindChild={onAddMindChild}
          onNodePointerDown={onNodePointerDown}
          onStartEdit={onStartEdit}
          onDraftChange={onDraftChange}
          onCommitEdit={onCommitEdit}
          onCancelEdit={onCancelEdit}
          onNodeSizeChange={onNodeSizeChange}
          onToggleListItem={onToggleListItem}
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
  // 思维导图父 → 子分支线 [{ id, styleId, varName, d }]
  mindBranchViews: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      styleId: PropTypes.string.isRequired,
      varName: PropTypes.string.isRequired,
      d: PropTypes.string.isRequired,
    }),
  ),
  // 思维导图派生信息 / 动作（非导图画布为 null / 缺省，见 CanvasNodeItem 注释）
  mindMetas: PropTypes.object,
  onMindMeasure: PropTypes.func,
  onToggleMindCollapse: PropTypes.func,
  onAddMindChild: PropTypes.func,
  selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedId: PropTypes.string,
  editingId: PropTypes.string,
  // 正在编辑的字段：text（正文，默认）/ title（卡片标题）/ item-<下标>（列表卡片待办行）
  editingField: PropTypes.string,
  draft: PropTypes.string,
  scale: PropTypes.number.isRequired,
  onNodePointerDown: PropTypes.func.isRequired,
  onStartEdit: PropTypes.func.isRequired,
  onDraftChange: PropTypes.func.isRequired,
  onCommitEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onNodeSizeChange: PropTypes.func.isRequired,
  // 列表卡片待办项勾选切换：(nodeId, itemIndex) => void
  onToggleListItem: PropTypes.func.isRequired,
}

export default memo(CanvasNodeLayer)
