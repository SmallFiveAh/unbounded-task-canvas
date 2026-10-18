/* 全局导航常量：菜单项、底部项、页面元信息 */

export const MENU_ITEMS = [
  { id: 'dashboard', label: '仪表盘', icon: 'bi-grid-1x2-fill' },
  { id: 'tasks', label: '我的任务', icon: 'bi-check2-square' },
  { id: 'taskslist', label: '任务列表', icon: 'bi-kanban' },
  { id: 'calendar', label: '日历', icon: 'bi-calendar3' },
  { id: 'analytics', label: '数据分析', icon: 'bi-bar-chart-line' },
]

export const BOTTOM_ITEMS = [
  { id: 'settings', label: '设置', icon: 'bi-gear' },
  { id: 'help', label: '帮助中心', icon: 'bi-question-circle' },
]

export const PAGE_META = {
  dashboard: { title: '仪表盘', desc: '总览你的任务进展与近期动态。' },
  tasks: { title: '我的任务', desc: '管理待办、进行中和已完成的任务。' },
  taskslist: { title: '任务列表', desc: '查看所有任务的列表。' },
  calendar: { title: '日历', desc: '按日期查看任务排期。' },
  analytics: { title: '数据分析', desc: '查看任务完成情况的统计报表。' },
  settings: { title: '设置', desc: '管理账户与偏好设置。' },
  help: { title: '帮助中心', desc: '查看使用指南与常见问题。' },
}

export const ALL_NAV_ITEMS = [...MENU_ITEMS, ...BOTTOM_ITEMS]
