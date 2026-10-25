/* ============================================================
   列表卡片拖拽创建 —— 按住拖到画布落节点
   ------------------------------------------------------------
   交互约定与卡片（useCardDragCreate）完全同构，服务于两处入口：
   · 左侧工具栏「列表卡片」按钮
   · 列表卡片样式面板里的任意样式缩略图
   交互约定：
   · 按下后位移超过阈值才进入拖拽（否则视为普通点击，
     交回 onClick 回调 —— 按钮开面板 / 缩略图选样式）
   · 拖拽中幽灵卡片实时跟随光标（fixed 定位，中心对齐）
   · 松手落在画布视口内 → 以光标为节点中心正式落库
     （落库即带默认标题 + 默认待办项，见 useCanvasNodes 的 addNode）；
     落在视口外 → 取消，不产生任何副作用
   · 幽灵渲染在 CanvasPanels（ListCardDragGhost），这里只出状态
   ============================================================ */

import { useCallback, useRef, useState } from 'react'
import { LIST_CARD_H, LIST_CARD_W } from '../lib/constants'
import { screenToWorld as toWorld } from '../lib/geometry'
import { listCardKind } from '../../../constants/listCardStyles'

const DRAG_THRESHOLD = 4 // 位移(px)超过该值才算拖拽，更小视为误触

/** 光标是否落在画布视口矩形内（松手才落库，拖出画布即取消） */
function isInsideViewport(clientX, clientY, viewportEl) {
  if (!viewportEl) return false
  const rect = viewportEl.getBoundingClientRect()
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  )
}

/**
 * @param {object} params
 * @param {import('react').MutableRefObject} params.viewportRef  画布视口（判定松手是否落在画布上）
 * @param {import('react').MutableRefObject} params.viewRef      当前视口 {x,y,scale}（松手时取最新值）
 * @param {(x:number, y:number, text?:string, kind?:string) => string} params.addNode 落库节点
 */
export function useListCardDragCreate({ viewportRef, viewRef, addNode }) {
  // 拖拽中的幽灵：{ styleId, x, y }（屏幕坐标）或 null
  const [ghost, setGhost] = useState(null)
  // 本次按下是否发生了拖拽：供 onClick 里吞掉拖拽结束后的残余 click
  const wasDragRef = useRef(false)

  /**
   * 在 pointerdown 里调用：接管后续 move / up。
   * @param {PointerEvent} e        原生 pointerdown 事件
   * @param {string} styleId        本次要创建的列表卡片样式 id
   * @param {() => void} [onClick]  未达到拖拽阈值（普通点击）时触发
   */
  const press = useCallback(
    (e, styleId, onClick) => {
      if (e.button !== 0) return
      e.preventDefault() // 拖拽途中禁止选中文本 / 触发原生拖放
      wasDragRef.current = false

      const startX = e.clientX
      const startY = e.clientY
      let dragging = false

      const finish = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
      }

      /** 松手落在画布视口内：以光标为中心落一个列表卡片节点 */
      const dropOnCanvas = (ev) => {
        const el = viewportRef.current
        if (!el || !isInsideViewport(ev.clientX, ev.clientY, el)) return
        // 用松手这一刻的最新视口换算，保证落点与拖拽中的幽灵一致
        // （拖拽期间可能滚轮缩放 / 平移，闭包里的 view 会过期）
        const world = toWorld(
          viewRef.current,
          el.getBoundingClientRect(),
          ev.clientX,
          ev.clientY,
        )
        // 默认内容（标题 + 待办项）由 addNode 按 kind 注入，这里不传 text
        addNode(world.x - LIST_CARD_W / 2, world.y - LIST_CARD_H / 2, '', listCardKind(styleId))
      }

      const onMove = (ev) => {
        if (!dragging) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return
          dragging = true
          wasDragRef.current = true
        }
        setGhost({ styleId, x: ev.clientX, y: ev.clientY })
      }

      const onUp = (ev) => {
        finish()
        if (!dragging) return onClick?.() // 普通点击：交回按钮 / 缩略图自己的点击语义
        setGhost(null)
        dropOnCanvas(ev)
      }

      const onCancel = () => {
        finish()
        setGhost(null)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onCancel)
    },
    [addNode, viewportRef, viewRef],
  )

  return { ghost, press, wasDragRef }
}
