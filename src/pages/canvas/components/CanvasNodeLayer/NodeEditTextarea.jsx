import PropTypes from 'prop-types'

/**
 * 节点编辑态输入框（正文 / 卡片标题共用）
 * ------------------------------------------------------------
 * 从 CanvasNodeItem 拆出的展示子组件：原本正文与卡片标题是
 * 两段几乎相同的 textarea，只差排版类 / 占位文案 / 初始行数，
 * 这里收敛成一份交互实现：
 * · 自动增高由 useEditAutoGrow 经 inputRef 控制（本组件不量高度）
 * · Enter 提交、Shift+Enter 换行、Esc 取消（与便签编辑一致）
 * · pointerdown / dblclick 截停：不触发节点拖拽与二次进入编辑
 *
 * 排版差异交给 className：正文 .nodeInput、标题 .cardTitleInput
 * （两态排版逐项对齐的约束见 CanvasNodeLayer.module.css 注释）。
 */
function NodeEditTextarea({
  inputRef,
  className,
  placeholder,
  rows,
  draft,
  onDraftChange,
  onCommitEdit,
  onCancelEdit,
}) {
  return (
    <textarea
      ref={inputRef}
      className={className}
      value={draft}
      placeholder={placeholder}
      autoFocus
      rows={rows}
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
  )
}

NodeEditTextarea.propTypes = {
  // 由 useEditAutoGrow 提供的 ref（自动增高用，显式传入不走 forwardRef）
  inputRef: PropTypes.object.isRequired,
  className: PropTypes.string.isRequired,
  placeholder: PropTypes.string.isRequired,
  rows: PropTypes.number.isRequired,
  draft: PropTypes.string.isRequired,
  onDraftChange: PropTypes.func.isRequired,
  onCommitEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
}

export default NodeEditTextarea
