/* ============================================================
   画布节点 —— 数据与增删改
   ------------------------------------------------------------
   从 useCanvasDocument 拆出的节点专属 hook：
   只持有 nodes 一个 useState，所有写操作都以「不可变更新」产出新数组。
   选中态不在这里：通过 onSelect / onElementRemoved 回调交回上层。
   ============================================================ */

import { useCallback, useState } from 'react'
import { NODE_H, NODE_W } from '../lib/constants'

/**
 * @param {object} params
 * @param {Array<object>} params.initialNodes                    首次挂载的初始节点（来自存档）
 * @param {(prefix: string) => string} params.nextId             id 生成器（由 useCanvasDocument 提供）
 * @param {(id: string) => void} params.onSelect                 新元素落地后同步选中
 * @param {(id: string) => void} params.onElementRemoved         元素删除后清理关联数据（如连线）
 * @param {import('react').MutableRefObject} params.viewportRef  视口容器（居中放置用）
 * @param {(x:number, y:number) => {x:number, y:number}} params.screenToWorld 屏幕坐标 → 世界坐标
 */
export function useCanvasNodes({
  initialNodes,
  nextId,
  onSelect,
  onElementRemoved,
  viewportRef,
  screenToWorld,
}) {
  const [nodes, setNodes] = useState(initialNodes)

  const addNode = useCallback(
    (x, y, text = '新节点', kind = 'muted') => {
      const id = nextId('n')
      setNodes((ns) => [...ns, { id, x, y, w: NODE_W, h: NODE_H, kind, text }])
      // 选中集合与主选中同步：新节点落地即带选中框
      onSelect(id)
      return id
    },
    [nextId, onSelect],
  )

  const addNodeAtCenter = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const world = screenToWorld(
      el.getBoundingClientRect().left + el.clientWidth / 2,
      el.getBoundingClientRect().top + el.clientHeight / 2,
    )
    addNode(world.x - NODE_W / 2, world.y - NODE_H / 2)
  }, [addNode, screenToWorld, viewportRef])

  const removeNode = useCallback(
    (id) => {
      setNodes((ns) => ns.filter((n) => n.id !== id))
      onElementRemoved(id)
    },
    [onElementRemoved],
  )

  // 提交节点文案：空白内容视为「不改」，保留原文字
  const commitNodeText = useCallback((id, raw) => {
    const text = raw.trim()
    if (!text) return
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, text } : n)))
  }, [])

  return { nodes, setNodes, addNode, addNodeAtCenter, removeNode, commitNodeText }
}
