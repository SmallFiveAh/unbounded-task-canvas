import { memo } from 'react'
import PropTypes from 'prop-types'
import styles from './CanvasSideToolbar.module.css'

/**
 * 左侧中间工具栏：便签 / 表格 / 思维导图 / 流程图 / 卡片 / 列表卡片
 * · 除便签 / 表格 / 思维导图外的按钮都是「再点一次取消」的开关，状态由 CanvasPage 持有
 * · 便签按钮特殊：按住可直接拖到画布创建节点（onNotePress 交接给
 *   useNoteDragCreate），普通点击弹出样式面板（onNoteClick，拖拽
 *   结束后的残余 click 由 CanvasPage 吞掉）
 * · 表格 / 思维导图按钮额外控制各自样式面板显隐，并把自己的
 *   DOM 节点作为面板锚点
 * 纯展示组件：只做点击 → 回调，不碰画布数据。
 */
function CanvasSideToolbar({
  sideTool,
  tablePanelOpen,
  notePanelOpen,
  mindPanelOpen,
  listPanelOpen,
  tableBtnRef,
  noteBtnRef,
  mindBtnRef,
  listBtnRef,
  toolbarRef,
  onToggleSideTool,
  onToggleTablePanel,
  onToggleMindPanel,
  onToggleListPanel,
  onNotePress,
  onNoteClick,
}) {
  return (
    <div ref={toolbarRef} className={styles.sideToolbar} role="toolbar" aria-label="元素工具栏">
      <button
        type="button"
        ref={noteBtnRef}
        className={`${styles.sideToolBtn}${notePanelOpen ? ` ${styles.active}` : ''}`}
        title="便签"
        onPointerDown={onNotePress}
        onClick={onNoteClick}
      >
        <i className="bi bi-sticky" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        ref={tableBtnRef}
        className={`${styles.sideToolBtn}${tablePanelOpen ? ` ${styles.active}` : ''}`}
        title="插入表格"
        onClick={onToggleTablePanel}
      >
        <i className="bi bi-table" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        ref={mindBtnRef}
        className={`${styles.sideToolBtn}${mindPanelOpen ? ` ${styles.active}` : ''}`}
        title="思维导图"
        onClick={onToggleMindPanel}
      >
        <i className="bi bi-diagram-3" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        className={`${styles.sideToolBtn}${sideTool === 'flow' ? ` ${styles.active}` : ''}`}
        title="流程图"
        onClick={() => onToggleSideTool('flow')}
      >
        <i className="bi bi-diagram-2" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        className={`${styles.sideToolBtn}${sideTool === 'card' ? ` ${styles.active}` : ''}`}
        title="卡片"
        onClick={() => onToggleSideTool('card')}
      >
        <i className="bi bi-card-checklist" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        ref={listBtnRef}
        className={`${styles.sideToolBtn}${listPanelOpen ? ` ${styles.active}` : ''}`}
        title="列表卡片"
        onClick={onToggleListPanel}
      >
        <i className="bi bi-list-ul" aria-hidden="true"></i>
      </button>
    </div>
  )
}

CanvasSideToolbar.propTypes = {
  sideTool: PropTypes.oneOf(['flow', 'card', null]),
  tablePanelOpen: PropTypes.bool.isRequired,
  notePanelOpen: PropTypes.bool.isRequired,
  mindPanelOpen: PropTypes.bool.isRequired,
  listPanelOpen: PropTypes.bool.isRequired,
  tableBtnRef: PropTypes.object.isRequired,
  noteBtnRef: PropTypes.object.isRequired,
  mindBtnRef: PropTypes.object.isRequired,
  listBtnRef: PropTypes.object.isRequired,
  toolbarRef: PropTypes.object.isRequired,
  onToggleSideTool: PropTypes.func.isRequired,
  onToggleTablePanel: PropTypes.func.isRequired,
  onToggleMindPanel: PropTypes.func.isRequired,
  onToggleListPanel: PropTypes.func.isRequired,
  onNotePress: PropTypes.func.isRequired,
  onNoteClick: PropTypes.func.isRequired,
}

export default memo(CanvasSideToolbar)
