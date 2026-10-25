import { useRef } from 'react'
import PropTypes from 'prop-types'
import MindNodeFace from '../../pages/canvas/components/CanvasNodeLayer/MindNodeFace'
import nodeStyles from '../../pages/canvas/components/CanvasNodeLayer/CanvasNodeLayer.module.css'
import mindVisualStyles from '../MindMapStyles/MindMapStyles.module.css'
import { useGhostMeasure, useGhostMindTree } from './useGhostMindTree'
import styles from './MindMapDragGhost.module.css'

/** 分支连线层：与画布 CanvasNodeLayer 同源的 SVG + --mm-b1/b2/b3 取色 */
function GhostBranchLayer({ branchViews }) {
  return (
    <svg className={nodeStyles.edgeLayer} aria-hidden="true">
      {branchViews.map((branch) => (
        <g key={branch.id} className={mindVisualStyles[branch.styleId] || ''}>
          <path
            d={branch.d}
            fill="none"
            className={nodeStyles.mindBranch}
            style={{ stroke: `var(${branch.varName}, var(--color-border))` }}
          />
        </g>
      ))}
    </svg>
  )
}

GhostBranchLayer.propTypes = {
  branchViews: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      styleId: PropTypes.string.isRequired,
      varName: PropTypes.string.isRequired,
      d: PropTypes.string.isRequired,
    }),
  ).isRequired,
}

/** 单个导图节点：复用画布 MindNodeFace，定位与样式类与画布节点一致。
 *  不钉内联宽高：让 .mindNode 的 max-content 自行撑开，
 *  这样 useGhostMeasure 量到的就是真实内容尺寸（与画布实测同源），
 *  而不是「估计值回写估计值」的自证循环。 */
function GhostNode({ node, meta }) {
  return (
    <div
      data-ghost-node={node.id}
      className={`${nodeStyles.node} ${nodeStyles.mindNode}`}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
      }}
    >
      <MindNodeFace
        node={node}
        meta={meta}
        editing={false}
        draft=""
        onDraftChange={() => {}}
        onCommitEdit={() => {}}
        onCancelEdit={() => {}}
        onToggleCollapse={() => {}}
        onAddChild={() => {}}
      />
    </div>
  )
}

GhostNode.propTypes = {
  node: PropTypes.object.isRequired,
  meta: PropTypes.object,
}

GhostNode.defaultProps = {
  meta: null,
}

/**
 * 思维导图拖拽幽灵 —— 按住导图按钮 / 面板缩略图拖动时的预览
 * ------------------------------------------------------------
 * 视觉直接复用画布节点的实现：根胶囊 / 分支文本条用 MindNodeFace，
 * 分支连线用 buildMindBranchViews（与画布同源的三次贝塞尔 +
 * --mm-b1/b2/b3 取色），布局用 layoutMindTrees。不再维护独立的 SVG
 * 缩略图，拖放预览与松手落库后的画布效果完全一致。
 *
 * 尺寸随画布缩放同步；根节点中心对齐光标（与 addMindMap 落点一致）。
 */
function MindMapDragGhost({ ghost, scale, onMeasure }) {
  if (!ghost) return null
  return <MindMapGhostBody ghost={ghost} scale={scale} onMeasure={onMeasure} />
}

function MindMapGhostBody({ ghost, scale, onMeasure }) {
  const { styleId } = ghost
  const containerRef = useRef(null)
  const sizes = useGhostMeasure(containerRef, styleId, onMeasure)
  const { laidOut, branchViews, metas, rootCenterX, rootCenterY, bbox } =
    useGhostMindTree(styleId, sizes)

  return (
    <div
      ref={containerRef}
      className={`${styles.ghost} ${mindVisualStyles[styleId] || ''}`}
      style={{
        position: 'fixed',
        left: ghost.x,
        top: ghost.y,
        zIndex: 300,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <div
        style={{
          position: 'relative',
          width: bbox.w,
          height: bbox.h,
          // translate 写在 scale 左侧 = 先缩放再平移，平移量不会被再缩放；
          // 因此要让根中心落在光标上，平移量必须先乘 scale。
          // （写成 translate(-rootCenterX) scale(scale) 会在非 100% 缩放下
          // 让幽灵偏离光标 (1 - scale) × 根半径，松手落库时就会「跳」回去）
          transform: `translate(${-rootCenterX * scale}px, ${-rootCenterY * scale}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        <GhostBranchLayer branchViews={branchViews} />
        {laidOut.map((n) => (
          <GhostNode key={n.id} node={n} meta={metas.get(n.id)} />
        ))}
      </div>
    </div>
  )
}

const ghostShape = {
  styleId: PropTypes.string.isRequired,
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
}

MindMapDragGhost.propTypes = {
  ghost: PropTypes.shape(ghostShape),
  scale: PropTypes.number.isRequired,
  // 实测尺寸上报（落库时用同一组尺寸，首帧即最终排布，避免落库后重排跳动）
  onMeasure: PropTypes.func,
}

MindMapGhostBody.propTypes = {
  ghost: PropTypes.shape(ghostShape).isRequired,
  scale: PropTypes.number.isRequired,
  onMeasure: PropTypes.func,
}

export default MindMapDragGhost
