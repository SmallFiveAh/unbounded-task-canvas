import styles from './CanvasToolbar.module.css'

/**
 * 顶部中间工具栏：选择 / 平移 / 鼠标滚轮缩放
 * 纯展示组件 —— 工具状态由 CanvasPage 持有，这里只负责把点击转成回调。
 */
export default function CanvasToolbar({
  tool,
  wheelZoom,
  onSelectTool,
  onTogglePan,
  onToggleWheelZoom,
}) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="画布工具栏">
      <button
        type="button"
        className={`${styles.toolIconBtn}${tool === 'select' ? ` ${styles.active}` : ''}`}
        title="选择（单击节点选中，按住空格 + 拖拽平移画布）"
        onClick={onSelectTool}
      >
        <i className="bi bi-cursor" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        className={`${styles.toolIconBtn}${tool === 'pan' ? ` ${styles.active}` : ''}`}
        title="平移（拖拽空白处移动画布）"
        onClick={onTogglePan}
      >
        <i className="bi bi-hand-index" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        className={`${styles.toolIconBtn}${wheelZoom ? ` ${styles.active}` : ''}`}
        title="鼠标滚轮缩放（激活后滚轮直接缩放画布，每次 5%）"
        onClick={onToggleWheelZoom}
      >
        <i className="bi bi-mouse" aria-hidden="true"></i>
      </button>
    </div>
  )
}
