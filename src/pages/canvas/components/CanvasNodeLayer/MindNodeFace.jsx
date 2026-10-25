import { useRef } from 'react'
import PropTypes from 'prop-types'
import { MIND_NODE_PLACEHOLDER } from '../../../../constants/mindMap'
import NodeEditTextarea from './NodeEditTextarea'
import styles from './MindNodeFace.module.css'

/**
 * 思维导图节点内容面 —— 根胶囊 / 分支文本条 + 悬停小圆球
 * ------------------------------------------------------------
 * 结构上只负责「内容与圆球」，定位（transform 定位到节点坐标）
 * 与尺寸实测（ResizeObserver 回写）仍由外层 CanvasNodeItem 负责：
 * 这里渲染的最外层 .group 不产生额外盒模型（inline-flex 收紧到
 * 内容宽度），外层容器的 fit-content 尺寸因此等于视觉尺寸。
 *
 * · 根节点（无 parentId）：描边胶囊，文字取 --mm-root
 * · 分支节点：圆角文本条（--mm-bar），固定深墨文字
 * · 小圆球（右侧 2px 起，间距 6px）：
 *   - 收起/展开球：仅有下一代（children 非空）的节点显示；
 *     收起时填充强调色并显示被收起的后代数量
 *   - 加节点球：任何节点都显示，点击在其下衍生一个子节点
 *   - 鼠标同时离开节点与圆球后隐藏（.group:hover 控制）
 * · 编辑态：镜像文本撑出宽度（节点宽度随内容自适应，见 module.css）
 */
function MindNodeFace({
  node,
  meta,
  editing,
  draft,
  onDraftChange,
  onCommitEdit,
  onCancelEdit,
  onToggleCollapse,
  onAddChild,
}) {
  const isRoot = !node.parentId
  const hasChildren = Boolean(meta?.hasChildren)
  const collapsed = Boolean(node.collapsed)
  const descendantCount = meta?.descendantCount ?? 0
  const showPlaceholder = !node.text
  // 输入框 ref（挂给 NodeEditTextarea 满足其协议；高度由镜像撑出，无需自动增高）
  const inputRef = useRef(null)

  const visualClass = `${styles.visual} ${isRoot ? styles.rootPill : styles.branchBar}`
  const textStyle = `${styles.typeface} ${styles.text} ${
    isRoot ? styles.textRoot : styles.textBranch
  }${showPlaceholder ? ` ${styles.textPlaceholder}` : ''}`

  return (
    <span className={styles.group}>
      <span className={visualClass}>
        {editing ? (
          <span className={styles.editBox}>
            {/* 镜像文本：不可见但占位，撑出输入框的宽度与高度；
                收尾零宽空格保住末尾空格 / 换行不被折叠 */}
            <span className={`${styles.typeface} ${styles.mirror}`} aria-hidden="true">
              {draft}
              {'\u200b'}
            </span>
            <NodeEditTextarea
              inputRef={inputRef}
              className={`${styles.typeface} ${styles.input} ${
                isRoot ? styles.inputRoot : styles.inputBranch
              }`}
              placeholder={MIND_NODE_PLACEHOLDER}
              rows={1}
              draft={draft}
              onDraftChange={onDraftChange}
              onCommitEdit={onCommitEdit}
              onCancelEdit={onCancelEdit}
            />
          </span>
        ) : (
          <span className={textStyle}>{showPlaceholder ? MIND_NODE_PLACEHOLDER : node.text}</span>
        )}
      </span>

      {/* 小圆球组：悬停节点时显形（收起/展开球仅在有下一代时出现） */}
      <span className={styles.balls}>
        {hasChildren && (
          <button
            type="button"
            className={`${styles.ball}${collapsed ? ` ${styles.ballCollapsed}` : ''}`}
            title={collapsed ? `展开 ${descendantCount} 个节点` : '收起下级节点'}
            aria-label={collapsed ? '展开下级节点' : '收起下级节点'}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onToggleCollapse(node.id)
            }}
          >
            {collapsed ? descendantCount : '−'}
          </button>
        )}
        <button
          type="button"
          className={styles.ball}
          title="添加子节点"
          aria-label="添加子节点"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onAddChild(node.id)
          }}
        >
          +
        </button>
      </span>
    </span>
  )
}

MindNodeFace.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.string.isRequired,
    text: PropTypes.string,
    parentId: PropTypes.string,
    collapsed: PropTypes.bool,
  }).isRequired,
  // buildMindMeta 中该节点的派生信息；缺失时按「无后代」兜底
  meta: PropTypes.shape({
    descendantCount: PropTypes.number.isRequired,
    branchVar: PropTypes.string,
    hasChildren: PropTypes.bool.isRequired,
  }),
  editing: PropTypes.bool.isRequired,
  draft: PropTypes.string.isRequired,
  onDraftChange: PropTypes.func.isRequired,
  onCommitEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onToggleCollapse: PropTypes.func.isRequired,
  onAddChild: PropTypes.func.isRequired,
}

MindNodeFace.defaultProps = {
  meta: null,
}

export default MindNodeFace
