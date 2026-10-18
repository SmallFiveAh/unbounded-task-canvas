import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './assets/styles/tokens.css'
import './assets/styles/base.css'
import App from './App.jsx'
import CanvasPage from './pages/CanvasPage.jsx'

// 轻量路径路由：/canvas/:taskId 为独立全屏画布页（通常在新标签页打开）
// Vite 开发服务器与 preview 默认对未知路径回退 index.html，无需额外配置
const canvasMatch = window.location.pathname.match(/^\/canvas\/([^/?#]+)/)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {canvasMatch ? (
      <CanvasPage taskId={decodeURIComponent(canvasMatch[1])} />
    ) : (
      <App />
    )}
  </StrictMode>,
)
