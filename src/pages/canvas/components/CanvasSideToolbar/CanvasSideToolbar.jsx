import { memo } from 'react'
import PropTypes from 'prop-types'
import styles from './CanvasSideToolbar.module.css'

/**
 * 左侧中间工具栏：便签 / 表格 / 思维导图 / 流程图 / 卡片 / 列表卡片
 * · 每个按钮控制各自面板显隐（「再点一次取消」），并把
 *   自己的 DOM 节点作为面板锚点
 * · 便签 / 卡片按钮特殊：按住可直接拖到画布创建节点（onNotePress /
 *   onCardPress 交接给 useNoteDragCreate / useCardDragCreate），普通点击
 *   弹出样式面板（onNoteClick / onCardClick，拖拽结束后的残余 click 由
 *   CanvasPage 吞掉）
 * 纯展示组件：只做点击 → 回调，不碰画布数据。
 */
function CanvasSideToolbar({
  tablePanelOpen,
  notePanelOpen,
  mindPanelOpen,
  flowPanelOpen,
  listPanelOpen,
  cardPanelOpen,
  tableBtnRef,
  noteBtnRef,
  mindBtnRef,
  flowBtnRef,
  listBtnRef,
  cardBtnRef,
  toolbarRef,
  onToggleTablePanel,
  onToggleMindPanel,
  onToggleFlowPanel,
  onToggleListPanel,
  onNotePress,
  onNoteClick,
  onCardPress,
  onCardClick,
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
        ref={flowBtnRef}
        className={`${styles.sideToolBtn}${flowPanelOpen ? ` ${styles.active}` : ''}`}
        title="流程图"
        onClick={onToggleFlowPanel}
      >
        <i className="bi bi-diagram-2" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        ref={cardBtnRef}
        className={`${styles.sideToolBtn}${cardPanelOpen ? ` ${styles.active}` : ''}`}
        title="卡片"
        onPointerDown={onCardPress}
        onClick={onCardClick}
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
  tablePanelOpen: PropTypes.bool.isRequired,
  notePanelOpen: PropTypes.bool.isRequired,
  mindPanelOpen: PropTypes.bool.isRequired,
  flowPanelOpen: PropTypes.bool.isRequired,
  listPanelOpen: PropTypes.bool.isRequired,
  cardPanelOpen: PropTypes.bool.isRequired,
  tableBtnRef: PropTypes.object.isRequired,
  noteBtnRef: PropTypes.object.isRequired,
  mindBtnRef: PropTypes.object.isRequired,
  flowBtnRef: PropTypes.object.isRequired,
  listBtnRef: PropTypes.object.isRequired,
  cardBtnRef: PropTypes.object.isRequired,
  toolbarRef: PropTypes.object.isRequired,
  onToggleTablePanel: PropTypes.func.isRequired,
  onToggleMindPanel: PropTypes.func.isRequired,
  onToggleFlowPanel: PropTypes.func.isRequired,
  onToggleListPanel: PropTypes.func.isRequired,
  onNotePress: PropTypes.func.isRequired,
  onNoteClick: PropTypes.func.isRequired,
  onCardPress: PropTypes.func.isRequired,
  onCardClick: PropTypes.func.isRequired,
}

export default memo(CanvasSideToolbar)
