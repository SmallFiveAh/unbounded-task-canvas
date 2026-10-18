import { MENU_ITEMS, BOTTOM_ITEMS } from '../../constants/navigation'
import styles from './Sidebar.module.css'

/**
 * 通用布局组件：左侧导航
 * 仅负责导航展示与切换回调，不含业务逻辑（分层规范）
 */

function NavItem({ item, active, collapsed, onSelect, index }) {
  return (
    <li>
      <button
        type="button"
        className={`${styles.navItem}${active ? ` ${styles.active}` : ''}`}
        style={{ '--i': index }}
        title={collapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        onClick={() => onSelect(item.id)}
      >
        {/* styles.bi 不可少：让 CSS Modules 作用域内的 .bi 尺寸规则命中全局 bootstrap 图标 */}
        <i className={`${styles.bi} bi ${item.icon}`} aria-hidden="true"></i>
        <span className={styles.navLabel}>
          <span>{item.label}</span>
        </span>
      </button>
    </li>
  )
}

export default function Sidebar({ activeId, onSelect, collapsed, onToggle }) {
  return (
    <aside
      className={`${styles.sidebar}${collapsed ? ` ${styles.collapsed}` : ''}`}
      aria-label="主导航"
    >
      {/* 品牌区：信号橙方标 + Sora 字标 */}
      <div className={styles.header} style={{ '--i': 0 }}>
        <span className={styles.mark} aria-hidden="true"></span>
        <span className={styles.wordmark}>任务管理</span>
      </div>

      <nav className={styles.nav}>
        <ul>
          {MENU_ITEMS.map((item, i) => (
            <NavItem
              key={item.id}
              item={item}
              active={item.id === activeId}
              collapsed={collapsed}
              onSelect={onSelect}
              index={i + 1}
            />
          ))}
        </ul>
      </nav>

      <div className={styles.bottom}>
        <ul>
          {BOTTOM_ITEMS.map((item, i) => (
            <NavItem
              key={item.id}
              item={item}
              active={item.id === activeId}
              collapsed={collapsed}
              onSelect={onSelect}
              index={MENU_ITEMS.length + i + 1}
            />
          ))}
        </ul>
        <button
          type="button"
          className={`${styles.navItem} ${styles.collapseBtn}`}
          style={{ '--i': MENU_ITEMS.length + BOTTOM_ITEMS.length + 1 }}
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? '展开菜单' : '收起菜单'}
          title={collapsed ? '展开菜单' : undefined}
        >
          {/* 固定同一字形，折叠态由 CSS 旋转 180°，避免换字硬切 */}
          <i className={`${styles.bi} bi bi-chevron-double-left`} aria-hidden="true"></i>
          <span className={styles.navLabel}>
            <span>{collapsed ? '展开菜单' : '收起菜单'}</span>
          </span>
        </button>
      </div>
    </aside>
  )
}
