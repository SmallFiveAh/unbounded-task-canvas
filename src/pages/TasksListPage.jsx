import { useState } from 'react'
import { CATEGORIES, TASKS } from '../constants/tasks'
import CanvasThumbnail from '../components/CanvasThumbnail/CanvasThumbnail'
import styles from './TasksListPage.module.css'

/**
 * 任务列表页面
 * 搜索栏 + 分类筛选 + 新建任务按钮 + 任务卡片列表
 * 卡片缩略图渲染该任务无限画布的结构预览（节点/连线/表格），文字内容不显示
 * 点击卡片在新标签页打开对应任务的无限画布 /canvas/:taskId
 */

/**
 * 状态徽标 */
function StatusBadge({ status }) {
  const variant =
    status === '已完成'
      ? 'done'
      : status === '进行中'
        ? 'active'
        : 'pending'

  return <span className={`${styles.statusBadge} ${styles[variant]}`}>{status}</span>
}

/**
 * 进度条 */
function ProgressBar({ progress }) {
  return (
    <div className={styles.progressBar}>
      <div
        className={styles.progressFill}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

/**
 * 任务卡片：整卡为链接，在新标签页打开无限画布 */
function TaskCard({ task, index }) {
  return (
    <a
      className={styles.taskCard}
      style={{ '--i': index }}
      href={`/canvas/${task.id}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`在新标签页打开「${task.title}」的无限画布`}
    >
      {/* 卡片上部：小地图缩略图 */}
      <div className={styles.thumbnailWrap}>
        <CanvasThumbnail task={task} />
        <span className={styles.openBadge}>
          <i className="bi bi-box-arrow-up-right" aria-hidden="true"></i>
          打开画布
        </span>
      </div>

      {/* 卡片下部：任务信息 */}
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{task.title}</h3>
          <StatusBadge status={task.status} />
        </div>

        <ProgressBar progress={task.progress} />

        <div className={styles.cardFooter}>
          <span className={styles.cardCategory}>
            {CATEGORIES.find((c) => c.key === task.category)?.label}
          </span>
          <time className="num" dateTime={task.updatedAt}>
            {task.updatedAt}
          </time>
        </div>
      </div>
    </a>
  )
}

export default function TasksListPage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const filtered = TASKS.filter((task) => {
    const matchSearch = task.title
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchCategory =
      activeCategory === 'all' || task.category === activeCategory
    return matchSearch && matchCategory
  })

  return (
    <section className={styles.page} aria-labelledby="taskslist-title">
      {/* 页面标题 */}
      <header className={styles.header}>
        <h1 id="taskslist-title" className={styles.pageTitle}>
          任务列表
        </h1>
      </header>

      {/* 搜索栏 + 新建任务按钮 */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <i className="bi bi-search" aria-hidden="true"></i>
          <input
            type="text"
            placeholder="搜索任务…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            aria-label="搜索任务"
          />
        </div>
        <button type="button" className={styles.newTaskBtn}>
          <i className="bi bi-plus-lg" aria-hidden="true"></i>
          新建任务
        </button>
      </div>

      {/* 分类筛选 */}
      <div className={styles.categories} role="tablist" aria-label="任务分类">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            role="tab"
            aria-selected={activeCategory === cat.key}
            className={`${styles.categoryBtn}${activeCategory === cat.key ? ` ${styles.active}` : ''}`}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 任务列表区域 */}
      {filtered.length > 0 ? (
        <div className={styles.taskGrid}>
          {filtered.map((task, i) => (
            <TaskCard key={task.id} task={task} index={i} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <i className="bi bi-inbox" aria-hidden="true"></i>
          <p>暂无匹配的任务</p>
        </div>
      )}
    </section>
  )
}
