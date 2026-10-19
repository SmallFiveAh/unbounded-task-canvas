/* ============================================================
   边框拉线 —— 从选中框边缘拖出一条连线
   ------------------------------------------------------------
   · 发起：SelectionFrame 四边的透明命中条（pointerdown）→ beginEdgeDrag，
     指针捕获交给视口，move / up 由 useViewportPointer 统一收口
     （与四角控制点缩放同一套模式：命中条可能被拖走，事件不丢）
   · 起点锚点 = 按下时指针在源元素矩形里的相对位置 —— 鼠标在哪拉线就在哪
   · 拖动：实时判定指针命中的目标元素，preview 供渲染层画预览线与目标高亮
   · 松手：落在其它元素上 → addEdge（终点锚点同样取指针的相对位置）；
     落在空白 / 源元素自身 → 取消，不落库。连线数量不设上限。
   ============================================================ */

import { useCallback, useMemo, useRef, useState } from 'react'
import { buildElementIndex, hitTestElement, relativeAnchor } from '../lib/edges'

export function useEdgeDrag({ nodes, tables, viewportRef, screenToWorld, addEdge }) {
  const dragRef = useRef(null) // 拉线状态：{ fromId, fromAnchor }
  const [preview, setPreview] = useState(null) // { fromId, fromAnchor, to, targetId }

  // 节点 + 表格的统一矩形索引：命中判定与路径换算（CanvasPage 渲染层）共用
  const elementIndex = useMemo(() => buildElementIndex(nodes, tables), [nodes, tables])

  const beginEdgeDrag = useCallback(
    (e, rect) => {
      const world = screenToWorld(e.clientX, e.clientY)
      const fromAnchor = relativeAnchor(rect, world)
      dragRef.current = { fromId: rect.id, fromAnchor }
      viewportRef.current?.setPointerCapture(e.pointerId)
      setPreview({ fromId: rect.id, fromAnchor, to: world, targetId: null })
    },
    [screenToWorld, viewportRef],
  )

  const applyEdgeDrag = useCallback(
    (e) => {
      const drag = dragRef.current
      if (!drag) return
      const world = screenToWorld(e.clientX, e.clientY)
      const targetId = hitTestElement(world, elementIndex, drag.fromId)
      setPreview((p) => (p ? { ...p, to: world, targetId } : p))
    },
    [screenToWorld, elementIndex],
  )

  const endEdgeDrag = useCallback(
    (e) => {
      const drag = dragRef.current
      dragRef.current = null
      if (drag) {
        // 不读 preview 状态（可能滞后一帧）：松手时按指针位置重新判定目标
        const world = screenToWorld(e.clientX, e.clientY)
        const targetId = hitTestElement(world, elementIndex, drag.fromId)
        if (targetId) {
          const toAnchor = relativeAnchor(elementIndex.get(targetId), world)
          addEdge(drag.fromId, targetId, drag.fromAnchor, toAnchor)
        }
      }
      setPreview(null)
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    },
    [screenToWorld, elementIndex, addEdge],
  )

  return { dragRef, preview, elementIndex, beginEdgeDrag, applyEdgeDrag, endEdgeDrag }
}
