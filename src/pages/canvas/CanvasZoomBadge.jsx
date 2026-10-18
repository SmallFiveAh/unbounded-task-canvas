import styles from './CanvasZoomBadge.module.css'

/**
 * 右下角缩放百分比浮层：点击重置为 100%
 * 纯粹的读数 + 一个回调，缩放本身由 useCanvasViewport 负责。
 */
export default function CanvasZoomBadge({ scale, onReset }) {
  return (
    <div className={styles.topbar}>
      <div className={styles.zoomPercent} title="点击重置为 100%" onClick={onReset}>
        {Math.round(scale * 100)}%
      </div>
    </div>
  )
}
