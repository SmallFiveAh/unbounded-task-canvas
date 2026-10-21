/* ============================================================
   便签拖拽创建 —— 按住拖到画布落节点
   ------------------------------------------------------------
   服务于两处入口（交互完全一致）：
   · 左侧工具栏「便签」按钮
   · 便签样式面板里的任意样式缩略图
   交互约定：
   · 按下后位移超过阈值才进入拖拽（否则视为普通点击，
     交回 onClick 回调 —— 按钮开面板 / 缩略图选样式）
   · 拖拽中幽灵节点实时跟随光标（fixed 定位，中心对齐）
   · 松手落在画布视口内 → 以光标为节点中心正式落库；
     落在视口外 → 取消，不产生任何副作用
   · 幽灵渲染在 CanvasPage（NoteDragGhost），这里只出状态
   ============================================================ */

import { useCallback, useRef, useState } from 'react'
import { NODE_H, NODE_W } from '../lib/constants'
import { noteKind } from '../../../constants/noteStyles'

const DRAG_THRESHOLD = 4 // 位移(px)超过该值才算拖拽，更小视为误触
const NOTE_DEFAULT_TEXT = '便签' // 新便签的初始文案，双击可编辑

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
 * @param {(x:number, y:number) => {x:number, y:number}} params.screenToWorld 屏幕坐标 → 世界坐标
 * @param {(x:number, y:number, text?:string, kind?:string) => string} params.addNode 落库节点
 */
export function useNoteDragCreate({ viewportRef, screenToWorld, addNode }) {
  // 拖拽中的幽灵：{ styleId, x, y }（屏幕坐标）或 null
  const [ghost, setGhost] = useState(null)
  // 本次按下是否发生了拖拽：供 onClick 里吞掉拖拽结束后的残余 click
  const wasDragRef = useRef(false)

  /**
   * 在 pointerdown 里调用：接管后续 move / up。
   * @param {PointerEvent} e        原生 pointerdown 事件
   * @param {string} styleId        本次要创建的便签样式 id
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

      /** 松手落在画布视口内：以光标为中心落一个便签节点 */
      const dropOnCanvas = (ev) => {
        if (!isInsideViewport(ev.clientX, ev.clientY, viewportRef.current)) return
        const world = screenToWorld(ev.clientX, ev.clientY)
        addNode(world.x - NODE_W / 2, world.y - NODE_H / 2, NOTE_DEFAULT_TEXT, noteKind(styleId))
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
        // 普通点击：交回按钮 / 缩略图自己的点击语义
        if (!dragging) {
          onClick?.()
          return
        }
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
    [addNode, screenToWorld, viewportRef],
  )

  return { ghost, press, wasDragRef }
}
