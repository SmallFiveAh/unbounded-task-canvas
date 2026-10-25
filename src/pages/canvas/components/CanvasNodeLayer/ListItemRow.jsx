import PropTypes from 'prop-types'
import { LIST_CARD_ITEM_PLACEHOLDER } from '../../lib/constants'
import styles from './CanvasNodeLayer.module.css'

/**
 * 列表卡片的单行待办（勾选框 + 文本 / 行内输入框）
 * ------------------------------------------------------------
 * 从 ListCardNodeFace 拆出的行级子组件，三种状态：
 * · 展示态       文本 span；末尾输入位空行显示占位文案（不落库）
 * · 编辑态       行内 input（value 接草稿，Enter 提交 / Esc 取消 / 失焦提交）
 * · 已完成态     文本锁定（双击不进入编辑），删除线由 .listItemDone 供给
 *
 * 指针约定（与勾选框一致）：可交互元素 pointerdown 截停，不冒泡到
 * 节点容器 —— 否则按下会先启动节点拖拽、吞掉后续 click。
 * · 勾选框：空行禁用（空内容没有「完成」可言）
 * · 文本：末尾输入位空行恒显示占位文案（showPlaceholder，幽灵也展示）；
 *   其中画布上的末行额外响应单击进入编辑（clickToEdit，幽灵无回调
 *   只展示不交互），内容行保持双击编辑（与卡片正文同一约定），
 *   按住可拖动卡片
 */
function ListItemRow({
  item,
  index,
  isEditing,
  showPlaceholder,
  clickToEdit,
  draft,
  onToggleItem,
  onDraftChange,
  onCommitEdit,
  onCancelEdit,
  onStartItemEdit,
}) {
  return (
    <span
      data-list-row={index}
      className={`${styles.listItem}${item.done ? ` ${styles.listItemDone}` : ''}`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        aria-label={item.done ? '标记为未完成' : '标记为已完成'}
        className={styles.listCheck}
        disabled={item.text === ''}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onToggleItem?.(index)
        }}
      >
        <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path className={styles.listCheckMark} d="M2.5 6.2 L5 8.6 L9.5 3.6" />
        </svg>
      </button>
      {isEditing ? (
        <input
          type="text"
          className={styles.listItemInput}
          value={draft}
          placeholder={LIST_CARD_ITEM_PLACEHOLDER}
          autoFocus
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
          className={`${styles.listItemText}${showPlaceholder ? ` ${styles.listItemTextPlaceholder}` : ''}`}
          onPointerDown={clickToEdit ? (e) => e.stopPropagation() : undefined}
          onClick={clickToEdit ? () => onStartItemEdit(index) : undefined}
        >
          {item.text || (showPlaceholder ? LIST_CARD_ITEM_PLACEHOLDER : '')}
        </span>
      )}
    </span>
  )
}

ListItemRow.propTypes = {
  item: PropTypes.shape({
    text: PropTypes.string.isRequired,
    done: PropTypes.bool.isRequired,
  }).isRequired,
  index: PropTypes.number.isRequired,
  isEditing: PropTypes.bool.isRequired,
  // 末尾输入位空行：显示「添加待办...」占位文案（仅展示，不落库；
  // 拖拽幽灵同样展示，保证「拖拽中 = 落库后」）
  showPlaceholder: PropTypes.bool.isRequired,
  // 单击文本即进入编辑（仅画布上的末行；幽灵不传回调）
  clickToEdit: PropTypes.bool.isRequired,
  draft: PropTypes.string,
  onToggleItem: PropTypes.func,
  onDraftChange: PropTypes.func,
  onCommitEdit: PropTypes.func,
  onCancelEdit: PropTypes.func,
  onStartItemEdit: PropTypes.func,
}

export default ListItemRow
