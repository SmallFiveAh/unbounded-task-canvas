/* ============================================================
   思维导图拖拽创建 —— 按住拖到画布落一棵默认导图
   ------------------------------------------------------------
   交互约定与卡片 / 便签（useCardDragCreate / useNoteDragCreate）
   完全同构，服务于两处入口：
   · 左侧工具栏「思维导图」按钮
   · 思维导图样式面板里的任意样式缩略图
   交互约定：
   · 按下后位移超过阈值才进入拖拽（否则视为普通点击，
     交回 onClick 回调 —— 按钮开面板 / 缩略图选样式）
   · 拖拽中幽灵导图实时跟随光标（fixed 定位，中心对齐），
     视觉即面板缩略图（根胶囊 + 三分支，与落库结构同构）
   · 松手落在画布视口内 → 以光标为根节点中心落一棵默认
     结构导图（根「主题」+ 三条「分支」）；落在视口外 → 取消
   · 幽灵渲染在 CanvasPanels（MindMapDragGhost），这里只出状态
   ============================================================ */

import { useCallback, useRef, useState } from 'react'
import { screenToWorld as toWorld } from '../lib/geometry'

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
 * @param {(x:number, y:number, styleId:string, sizes?:object) => string} params.addMindMap
 *        落库一棵导图（根中心对齐落点；sizes 为幽灵实测尺寸，缺省用估计值）
 */
export function useMindMapDragCreate({ viewportRef, viewRef, addMindMap }) {
  // 拖拽中的幽灵：{ styleId, x, y }（屏幕坐标）或 null
  const [ghost, setGhost] = useState(null)
  // 本次按下是否发生了拖拽：供 onClick 里吞掉拖拽结束后的残余 click
  const wasDragRef = useRef(false)
  // 幽灵实测的节点尺寸（MindMapDragGhost 上报）：落库时原样使用，
  // 保证画布首帧排布与拖拽预览逐像素一致，松手不重排、不跳动
  const sizesRef = useRef(null)
  const reportSizes = useCallback((sizes) => {
    sizesRef.current = sizes
  }, [])

  /**
   * 在 pointerdown 里调用：接管后续 move / up。
   * @param {PointerEvent} e        原生 pointerdown 事件
   * @param {string} styleId        本次要创建的导图样式 id
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

      /** 松手落在画布视口内：以光标为根节点中心落一棵默认导图 */
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
        addMindMap(world.x, world.y, styleId, sizesRef.current)
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
    [addMindMap, viewportRef, viewRef],
  )

  return { ghost, press, wasDragRef, reportSizes }
}
