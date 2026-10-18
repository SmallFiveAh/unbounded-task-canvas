import { useState } from 'react'
import 'bootstrap-icons/font/bootstrap-icons.css'
import Sidebar from './components/Sidebar'
import PlaceholderPage from './pages/PlaceholderPage'
import TasksListPage from './pages/TasksListPage'
import { PAGE_META, ALL_NAV_ITEMS } from './constants/navigation'
import './App.css'

function App() {
  const [activeId, setActiveId] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)

  const page = PAGE_META[activeId]
  const pageIndex = ALL_NAV_ITEMS.findIndex((item) => item.id === activeId)

  return (
    <div className="app-layout">
      <Sidebar
        activeId={activeId}
        onSelect={setActiveId}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />
      <main className="app-main">
        {/* key 触发重挂载，每次切换重放页面入场序列 */}
        {activeId === 'taskslist' ? (
          <TasksListPage key="taskslist" />
        ) : (
          <PlaceholderPage
            key={activeId}
            title={page.title}
            desc={page.desc}
            index={pageIndex}
            total={ALL_NAV_ITEMS.length}
          />
        )}
      </main>
    </div>
  )
}

export default App
