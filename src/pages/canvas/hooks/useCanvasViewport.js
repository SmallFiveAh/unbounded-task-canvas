/* ============================================================
   画布视口 —— 平移与缩放
   ------------------------------------------------------------
   · view = { x, y, scale }：世界层的平移偏移与缩放比例
   · 滚轮：Ctrl/⌘ + 滚轮缩放到光标处；激活「鼠标滚轮」按钮后滚轮直接缩放
   · 首次进入：没有视口记忆时自适应全部内容，有记忆则原样恢复
   · viewRef 让「内容落盘」能读到当前视口而不必把它写进依赖
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getTableSize } from '../../../constants/canvasTable'
import { clampScale, screenToWorld as toWorld } from '../lib/geometry'

export function useCanvasViewport({ initial, wheelZoom }) {
  const viewportRef = useRef(null)

  // 视图（平移 + 缩放）：优先恢复上次离开时的视口，没有记忆才走「自适应全部内容」
  const initialView = useMemo(
    () => initial.view ?? { x: 0, y: 0, scale: 1 },
    [initial],
  )
  const [view, setView] = useState(initialView)
  const viewRef = useRef(initialView) // 供「内容落盘」读取当前视口，避免拖动时重复写

  // 让一组内容（节点/表格的包围盒）在视口中居中（自适应 / 初次进入）
  const frameContent = useCallback((rects) => {
    const el = viewportRef.current
    if (!el) return
    const w = el.clientWidth
    const h = el.clientHeight

    if (!rects.length) {
      setView({ x: w / 2, y: h / 2, scale: 1 })
      return
    }

    const minX = Math.min(...rects.map((r) => r.x))
    const minY = Math.min(...rects.map((r) => r.y))
    const maxX = Math.max(...rects.map((r) => r.x + r.w))
    const maxY = Math.max(...rects.map((r) => r.y + r.h))
    const bw = Math.max(maxX - minX, 1)
    const bh = Math.max(maxY - minY, 1)
    const padding = 140

    const scale = clampScale(
      Math.min((w - padding * 2) / bw, (h - padding * 2) / bh, 1.4),
    )
    setView({
      scale,
      x: w / 2 - (minX + bw / 2) * scale,
      y: h / 2 - (minY + bh / 2) * scale,
    })
  }, [])

  // 初次进入：没有视口记忆时才自适应全部内容；
  // 有记忆则原样回到上次的缩放与位置（localStorage 里的 view）
  useEffect(() => {
    if (initial.view) return
    frameContent([
      ...initial.nodes.map((n) => ({ x: n.x, y: n.y, w: n.w, h: n.h })),
      ...initial.tables.map((t) => ({
        x: t.x,
        y: t.y,
        ...getTableSize(t),
      })),
    ])
    // 仅挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 视口同步到 ref：内容落盘时一并带上当前视图（effect 顺序在内容保存之前）
  useEffect(() => {
    viewRef.current = view
  }, [view])

  // 以视口某点为锚点缩放
  const zoomAt = useCallback((anchorX, anchorY, factor) => {
    setView((v) => {
      const scale = clampScale(v.scale * factor)
      const ratio = scale / v.scale
      return {
        scale,
        x: anchorX - (anchorX - v.x) * ratio,
        y: anchorY - (anchorY - v.y) * ratio,
      }
    })
  }, [])

  const zoomByStep = useCallback(
    (factor) => {
      const el = viewportRef.current
      if (!el) return
      zoomAt(el.clientWidth / 2, el.clientHeight / 2, factor)
    },
    [zoomAt],
  )

  // 滚轮：Ctrl/⌘ + 滚轮缩放（含触控板捏合），其余平移；需非 passive 才能阻止页面缩放
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const onWheel = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mode = e.deltaMode === 1 ? 16 : 1 // 兼容“按行滚动”的设备
      if (wheelZoom || e.ctrlKey || e.metaKey) {
        // 鼠标滚轮按钮：固定 5% 缩放步长
        const factor = e.deltaY < 0 ? 1.05 : 0.95
        zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor)
      } else {
        setView((v) => ({
          ...v,
          x: v.x - e.deltaX * mode,
          y: v.y - e.deltaY * mode,
        }))
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt, wheelZoom])

  // 屏幕坐标 → 世界坐标（每次 view 变化后重建，拿到最新视口）
  const screenToWorld = useCallback(
    (clientX, clientY) => {
      const rect = viewportRef.current.getBoundingClientRect()
      return toWorld(view, rect, clientX, clientY)
    },
    [view],
  )

  return {
    viewportRef,
    view,
    setView,
    viewRef,
    initialView,
    frameContent,
    zoomAt,
    zoomByStep,
    screenToWorld,
  }
}
