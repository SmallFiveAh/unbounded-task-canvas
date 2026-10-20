/* ============================================================
   网格背景样式 —— 纯函数
   ------------------------------------------------------------
   视口背景的点阵网格（细网格 + 主网格两层 radial-gradient）。
   不依赖 React、不读写状态。
   ============================================================ */

import { GRID_FINE, GRID_MAJOR } from './constants'

/** 高倍率下细网格的细分倍率阶梯：>=4 倍细分 4 份，>=2 倍细分 2 份 */
const SUBDIVISION_STEPS = [
  { minScale: 4, sub: 4 },
  { minScale: 2, sub: 2 },
]

/** 缩放低于该值时隐藏细网格，避免密集摩尔纹 */
const FINE_HIDE_BELOW = 0.5

/** 细网格颜色（低倍率时透明） */
const FINE_COLOR = 'var(--color-wash)'

/**
 * 计算视口网格背景的 style 对象
 * @param {{x:number, y:number, scale:number}} view 当前视口
 * @returns {{backgroundImage:string, backgroundSize:string, backgroundPosition:string}}
 */
export function gridBackgroundStyle(view) {
  // 高倍率下细网格跟着细分，避免 500% 时格距过大、画面发大块
  const sub = SUBDIVISION_STEPS.find((s) => view.scale >= s.minScale)?.sub ?? 1
  const fine = (GRID_FINE / sub) * view.scale
  const major = GRID_MAJOR * view.scale
  const fineColor = view.scale < FINE_HIDE_BELOW ? 'transparent' : FINE_COLOR
  const gridPos = `${view.x}px ${view.y}px`

  return {
    backgroundImage: `radial-gradient(circle, ${fineColor} 1px, transparent 1px),
      radial-gradient(circle, var(--color-border) 2px, transparent 2px)`,
    backgroundSize: `${fine}px ${fine}px, ${major}px ${major}px`,
    backgroundPosition: `${gridPos}, ${gridPos}`,
  }
}
