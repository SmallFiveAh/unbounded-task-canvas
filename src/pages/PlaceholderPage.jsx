import PropTypes from 'prop-types'
import styles from './PlaceholderPage.module.css'

/**
 * 页面级占位组件：为尚未实现的模块提供统一、有设计感的落点。
 * 大标题 + 序号刻度 + 状态签，切换页面时通过 key 重挂载重放入场序列。
 */
export default function PlaceholderPage({ title, desc, index, total }) {
  const no = String(index + 1).padStart(2, '0')
  const count = String(total).padStart(2, '0')

  return (
    <section className={styles.page} aria-labelledby="page-title">
      <p className={`${styles.index} num`} style={{ '--i': 0 }}>
        {no}
        <span className={styles.indexTotal}> / {count}</span>
      </p>

      <h1 id="page-title" className={styles.title} style={{ '--i': 1 }}>
        {title}
      </h1>

      <hr className={styles.rule} style={{ '--i': 2 }} />

      <p className={styles.desc} style={{ '--i': 3 }}>
        {desc}
      </p>

      <p className={styles.status} style={{ '--i': 4 }}>
        <span className={styles.statusDot} aria-hidden="true"></span>
        模块规划中
      </p>
    </section>
  )
}

PlaceholderPage.propTypes = {
  title: PropTypes.string.isRequired,
  desc: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
}
