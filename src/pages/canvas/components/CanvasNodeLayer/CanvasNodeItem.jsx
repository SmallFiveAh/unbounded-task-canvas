import { memo } from 'react'
import PropTypes from 'prop-types'
import { CARD_TITLE_PLACEHOLDER, NODE_RADIUS } from '../../lib/constants'
import { resolveMinHeight } from '../../lib/noteSize'
import { cornerRadius } from '../../../../utils/canvasRadius'
import CardNodeFace from './CardNodeFace'
import ListCardNodeFace from './ListCardNodeFace'
import NodeEditTextarea from './NodeEditTextarea'
import {
  buildNodeClassName,
  resolveDoubleClickEditField,
  resolveNodeAppearance,
} from './nodeAppearance'
import { useEditAutoGrow } from './useEditAutoGrow'
import { useNodeAutoHeight } from './useNodeAutoHeight'
import styles from './CanvasNodeLayer.module.css'

/**
 * 单个画布节点（memo 化）
 * ------------------------------------------------------------
 * 从 CanvasNodeLayer 拆出的展示子组件：拖拽期间只有被拖节点的
 * node 对象身份变化，其余节点因 memo 浅比较通过而整帧跳过渲染
 * （DevTools 打开时，全量重渲染的成本足以把帧预算打爆）。
 * 回调 prop 全部来自上层稳定引用，onPointerDown 在组件内部
 * 再包一层箭头函数不影响 memo 判定（比较的是上层传入的 prop）。
 *
 * 本组件只做组装，职责分层见同目录各文件：
 * · nodeAppearance.js    kind → 样式类 / 占位文案 / 双击字段判定（纯函数）
 * · useNodeAutoHeight    高度实测回写（ResizeObserver）
 * · useEditAutoGrow      编辑态 textarea 自动增高
 * · NodeEditTextarea     正文 / 标题共用编辑框
 * · CardNodeFace / ListCardNodeFace  卡片 / 列表卡片的内容展示面
 */
function CanvasNodeItem({
  node,
  selected,
  primary,
  editing,
  editingField,
  draft,
  scale,
  onNodePointerDown,
  onStartEdit,
  onDraftChange,
  onCommitEdit,
  onCancelEdit,
  onNodeSizeChange,
  onToggleListItem,
}) {
  const appearance = resolveNodeAppearance(node, editing, editingField)
  const nodeRef = useNodeAutoHeight(node, onNodeSizeChange)
  const { inputRef, titleInputRef } = useEditAutoGrow(editing, draft)

  // 双击 → 编辑字段判定在 nodeAppearance 里按命中坐标完成（卡片 /
  // 列表卡片的 dblclick target 会被拖拽的指针捕获重定向成本容器）
  const handleDoubleClick = (e) => {
    e.stopPropagation()
    const field = resolveDoubleClickEditField(e, appearance)
    if (field) onStartEdit(node, field)
  }

  // 编辑态输入框：正文（普通节点 / 便签 / 卡片正文）与标题共用一份实现
  const textInput = (
    <NodeEditTextarea
      inputRef={inputRef}
      className={styles.nodeInput}
      placeholder={appearance.placeholder}
      rows={2}
      draft={draft}
      onDraftChange={onDraftChange}
      onCommitEdit={onCommitEdit}
      onCancelEdit={onCancelEdit}
    />
  )
  const titleInput = (
    <NodeEditTextarea
      inputRef={titleInputRef}
      className={styles.cardTitleInput}
      placeholder={CARD_TITLE_PLACEHOLDER}
      rows={1}
      draft={draft}
      onDraftChange={onDraftChange}
      onCommitEdit={onCommitEdit}
      onCancelEdit={onCancelEdit}
    />
  )

  return (
    <div
      ref={nodeRef}
      data-node-id={node.id}
      className={buildNodeClassName(node, appearance, selected, primary)}
      style={{
        // 用 transform 定位而不是 left/top：拖拽每帧只动 x/y，
        // transform 走合成器，跳过整层 reflow + 重绘（box-shadow 很贵）
        transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
        width: node.w,
        // 高度交给内容撑开（minHeight 用「用户下限 minH」兜住手动拉大的下限），
        // 全部节点统一走内容自适应（机制见 lib/noteSize.js）。
        // 注意这里不能再用 node.h —— h 是测量结果，若拿它当 minHeight，
        // 高度就只会增不会减，且与缩放拖拽互相覆盖造成漂移。
        height: 'auto',
        minHeight: resolveMinHeight(node),
        // 圆角随缩放补偿：缩小时至少保留 3.5 个屏幕像素，避免「看起来是直角」
        borderRadius: cornerRadius(NODE_RADIUS, node.w, node.h, scale),
      }}
      onPointerDown={(e) => onNodePointerDown(e, node)}
      // move / up 不挂在这里：按下时指针捕获在节点上，事件会冒泡到视口，
      // 由 useViewportPointer 统一收口（挂两遍会把每次 move 跑两遍）
      onDoubleClick={handleDoubleClick}
    >
      {appearance.isCard ? (
        /* 卡片节点：两个可编辑区域交给 CardNodeFace ——
           外层 cardInner 是容器的第一个子元素，内容高度测量以它为单位
           （见 noteSize.js）；编辑中的区域经插槽换成输入框，不拆散包裹层。
           双击封面带 → 编辑标题；双击正文区 → 编辑正文 */
        <CardNodeFace
          title={appearance.cardTitle}
          body={appearance.cardBody}
          placeholder={appearance.placeholder}
          titlePlaceholder={CARD_TITLE_PLACEHOLDER}
          titleSlot={appearance.isEditingTitle ? titleInput : undefined}
          bodySlot={appearance.isEditingText ? textInput : undefined}
        />
      ) : appearance.isListCard ? (
        /* 列表卡片节点：标题带（双击可编辑，复用卡片标题输入框）+
           待办行（勾选框点击切换完成态，勾选截停指针不上抛拖拽），
           内容高度测量同样以 cardInner 为单位（见 noteSize.js） */
        <ListCardNodeFace
          title={appearance.cardTitle}
          items={node.items || []}
          titleSlot={appearance.isEditingTitle ? titleInput : undefined}
          onToggleItem={(index) => onToggleListItem(node.id, index)}
        />
      ) : editing ? (
        textInput
      ) : (
        <span
          className={`${styles.nodeText}${
            appearance.showPlaceholder ? ` ${styles.nodeTextPlaceholder}` : ''
          }`}
        >
          {appearance.showPlaceholder ? appearance.placeholder : node.text}
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
    // 卡片独有：封面标题带的标题字段
    title: PropTypes.string,
    // 列表卡片独有：待办项 [{ text, done }]
    items: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string.isRequired,
        done: PropTypes.bool.isRequired,
      }),
    ),
    // 高度自适应度量：用户高度下限 / 内容实测高度（见 lib/noteSize.js）
    minH: PropTypes.number,
    contentH: PropTypes.number,
  }).isRequired,
  selected: PropTypes.bool.isRequired,
  primary: PropTypes.bool.isRequired,
  editing: PropTypes.bool.isRequired,
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
  // 列表卡片待办项勾选切换：(nodeId, itemIndex) => void
  onToggleListItem: PropTypes.func.isRequired,
}

export default memo(CanvasNodeItem)
