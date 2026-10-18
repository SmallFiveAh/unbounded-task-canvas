import styles from './CanvasSaveHint.module.css'

/**
 * 右上角「已保存到本地」提示
 * 显隐不走 React 状态：由 useCanvasPersistence 直接改 data-visible，
 * 这样每次落盘都不会重渲染整张画布（5 秒后 CSS 过渡淡出）。
 */
export default function CanvasSaveHint({ hintRef }) {
  return (
    <div ref={hintRef} className={styles.saveHint} data-visible="false" role="status">
      <i className="bi bi-cloud-check" aria-hidden="true"></i>
      已保存到本地
    </div>
  )
}
