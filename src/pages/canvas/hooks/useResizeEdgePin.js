/* ============================================================
   缩放手势期间的固定边兜底（从 useSelectionResize 拆出的行为 hook）
   ------------------------------------------------------------
   手势期间「对边零位移」是硬约束，而不是只在指针移动那一帧成立。
   节点的高度由内容决定，ResizeObserver 可能在任何一帧回写新的 h
   （拖窄 → 文字重排变高、字体度量抖动…），此时若左上角还停在上一帧的位置，
   固定边就会被推着走 —— 这就是「缩放时选中框漂移」的真正来源。
   ============================================================ */

import { useLayoutEffect } from 'react'

/**
 * @param {object} resizeRef     缩放手势状态 ref（非 node 手势不生效）
 * @param {Array}  nodes         节点列表（h 被测量回写后触发兜底）
 * @param {Function} setNodes    节点更新
 * @param {Function} setResizeLabel 实时尺寸徽标更新
 */
export function useResizeEdgePin({ resizeRef, nodes, setNodes, setResizeLabel }) {
  // 收敛性：写入后 y + h 恒等于 pinBottom，下一轮比较相等即不再写入，不会自激。
  // 容差 1px：offsetHeight 与内容测量之间有取整差，不能为这点差异每帧抖一次。
  useLayoutEffect(() => {
    const rz = resizeRef.current
    if (!rz || rz.kind !== 'node') return
    const node = nodes.find((n) => n.id === rz.id)
    if (!node) return
    const x = rz.fromWest ? rz.pinRight - node.w : node.x
    const y = rz.fromNorth ? rz.pinBottom - node.h : node.y
    if (Math.abs(x - node.x) < 1 && Math.abs(y - node.y) < 1) return
    setNodes((ns) => ns.map((n) => (n.id === rz.id ? { ...n, x, y } : n)))
    setResizeLabel({ w: Math.round(node.w), h: Math.round(node.h) })
  }, [nodes, setNodes, resizeRef, setResizeLabel])
}
