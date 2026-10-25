import PropTypes from 'prop-types'
import styles from './MindMapStyles.module.css'
/**
 * 思维导图缩略图 SVG —— 面板缩略图与拖拽幽灵共用
 * ------------------------------------------------------------
 * 与默认导图结构同构：描边胶囊根节点 → 三条彩色弧线分支
 * 向右扇出 → 末端三根文本条。颜色由样式类注入的 --mm-* 变量
 * 供给（样式类加在外层元素上），画布节点的真实视觉也按这套
 * 变量渲染（根 = 描边胶囊、分支 = 圆角文本条），三处同源。
 */
function MindMapThumb({ className }) {
  return (
    <svg className={className} viewBox="0 0 96 56" aria-hidden="true" focusable="false">
      {/* 三条分支：从根节点右缘出发，向右上 / 右 / 右下扇出 */}
      <path
        className={`${styles.branch} ${styles.branchB1}`}
        d="M33 28 C 45 28, 47 10, 61 10"
      />
      <path className={`${styles.branch} ${styles.branchB2}`} d="M33 28 L 61 28" />
      <path
        className={`${styles.branch} ${styles.branchB3}`}
        d="M33 28 C 45 28, 47 46, 61 46"
      />
      {/* 分支末端的文本条 */}
      <rect className={styles.bar} x="64" y="6.5" width="28" height="7" rx="3.5" />
      <rect className={styles.bar} x="64" y="24.5" width="28" height="7" rx="3.5" />
      <rect className={styles.bar} x="64" y="42.5" width="28" height="7" rx="3.5" />
      {/* 根节点：描边胶囊（最后绘制，压在分支起点之上） */}
      <rect className={styles.root} x="3" y="19" width="30" height="18" rx="9" />
    </svg>
  )
}

MindMapThumb.propTypes = {
  className: PropTypes.string,
}

export default MindMapThumb
