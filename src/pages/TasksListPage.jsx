import { useState } from 'react'
import { CATEGORIES, TASKS, buildCanvas } from '../constants/tasks'
import styles from './TasksListPage.module.css'

/**
 * 任务列表页面
 * 搜索栏 + 分类筛选 + 新建任务按钮 + 任务卡片列表
 * 卡片小地图缩略图展示无限画布内容
 * 点击卡片在新标签页打开对应任务的无限画布 /canvas/:taskId
 */

/**
 * 小地图缩略图：与无限画布共用 buildCanvas 布局，
 * 按内容包围盒自适应 viewBox，保证节点/连线完整显示且与画布一致。
 * 当画布无内容时不显示缩略图
 */
function CanvasThumbnail({ task }) {
  const hasContent = task.thumbnail === 'canvas'
  if (!hasContent || !(task.canvasElements || []).length) {
    return (
      <div className={styles.emptyThumbnail}>
        <i className="bi bi-inbox" aria-hidden="true"></i>
      </div>
    )
  }

  // 与无限画布页一致的节点/连线布局（世界坐标）
  const { nodes, edges } = buildCanvas(task)
  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  // 内容包围盒 + 留白，扩展为正方形 viewBox（与缩略图区域比例一致），确保完整显示
  const pad = 40
  const minX = Math.min(...nodes.map((n) => n.x)) - pad
  const minY = Math.min(...nodes.map((n) => n.y)) - pad
  const maxX = Math.max(...nodes.map((n) => n.x + n.w)) + pad
  const maxY = Math.max(...nodes.map((n) => n.y + n.h)) + pad
  const side = Math.max(maxX - minX, maxY - minY)
  const vx = (minX + maxX) / 2 - side / 2
  const vy = (minY + maxY) / 2 - side / 2
  const unit = side / 240 // 视觉参数随场景尺寸等比缩放

  const gridId = `thumb-grid-${task.id}`
  const arrowId = `thumb-arrow-${task.id}`

  return (
    <svg
      className={styles.thumbnailSvg}
      viewBox={`${vx} ${vy} ${side} ${side}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* 网格背景：与画布一致的点状网格 */}
        <pattern
          id={gridId}
          width={24}
          height={24}
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx="1"
            cy="1"
            r={1 * unit}
            fill="var(--color-border)"
          />
        </pattern>
        <marker
          id={arrowId}
          markerWidth="8"
          markerHeight="8"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" style={{ fill: 'var(--color-muted)' }} />
        </marker>
      </defs>
      <rect x={vx} y={vy} width={side} height={side} fill={`url(#${gridId})`} />

      {/* 连线：样式与画布一致（虚线 + 箭头） */}
      {edges.map((edge) => {
        const from = nodeById.get(edge.from)
        const to = nodeById.get(edge.to)
        if (!from || !to) return null
        return (
          <line
            key={edge.id}
            x1={from.x + from.w / 2}
            y1={from.y + from.h / 2}
            x2={to.x + to.w / 2}
            y2={to.y + to.h / 2}
            stroke="var(--color-muted)"
            strokeWidth={1.5 * unit}
            strokeDasharray={`${6 * unit} ${4 * unit}`}
            opacity="0.7"
            markerEnd={`url(#${arrowId})`}
          />
        )
      })}

      {/* 节点：样式与画布一致（accent 为橙色高亮节点） */}
      {nodes.map((node) => (
        <g key={node.id}>
          <rect
            x={node.x}
            y={node.y}
            width={node.w}
            height={node.h}
            rx={6 * unit}
            fill={
              node.kind === 'accent'
                ? 'var(--color-selection)'
                : 'var(--color-surface)'
            }
            stroke={
              node.kind === 'accent'
                ? 'var(--color-accent)'
                : 'var(--color-border)'
            }
            strokeWidth={(node.kind === 'accent' ? 2 : 1) * unit}
          />
          {/* 模拟文字行 */}
          <rect
            x={node.x + 12 * unit}
            y={node.y + node.h / 2 - 3 * unit}
            width={node.w * 0.5}
            height={6 * unit}
            rx={3 * unit}
            fill={
              node.kind === 'accent'
                ? 'var(--color-accent)'
                : 'var(--color-border)'
            }
          />
        </g>
      ))}
    </svg>
  )
}

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
