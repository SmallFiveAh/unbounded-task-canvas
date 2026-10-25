/* ============================================================
   画布内容 —— 节点 / 连线 / 表格的数据与增删改（组合层）
   ------------------------------------------------------------
   这里是画布唯一的数据源，按元素类型拆成三个子 hook：
   · useCanvasNodes   节点（addNode / removeNode / commitNodeText …）
   · useCanvasTables  表格（addTable / updateTableCell / pasteTableCells …）
   · useCanvasMindMaps 思维导图（addMindMap / addMindChild / 收展 / 尺寸回写）
   所有写操作都以「不可变更新」产出新数组，方便持久化 effect 用
   引用比较判断「是否变化」。选中态不在这里：通过 onSelect /
   onNodeRemoved / onTableRemoved / onElementsRemoved 回调交给
   useCanvasSelection（后者用于框选后的批量删除）。

   对外返回与拆分前完全一致的对象，CanvasPage 的调用方式不变。
   ============================================================ */

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useCanvasNodes } from './useCanvasNodes'
import { useCanvasTables } from './useCanvasTables'
import { useCanvasMindMaps } from './useCanvasMindMaps'
import { isMindNode, collectMindTreeIds } from '../lib/mindLayout'

export function useCanvasDocument({
  initial,
  viewportRef,
  screenToWorld,
  onSelect,
  onNodeRemoved,
  onTableRemoved,
  onElementsRemoved,
}) {
  const idSeq = useRef(0)

  const nextId = useCallback((prefix) => {
    idSeq.current += 1
    // 带上时间戳，避免与存档里上一轮生成的 id 撞车
    return `${prefix}-${Date.now().toString(36)}-${idSeq.current}`
  }, [])

  const [edges, setEdges] = useState(initial.edges)

  // 连线落库：一对锚点记录两端在元素矩形里的相对位置，元素移动后端点不漂移；
  // 不做去重 —— 同一对元素之间允许任意多条连线
  const addEdge = useCallback(
    (from, to, fromAnchor, toAnchor) => {
      const id = nextId('e')
      setEdges((es) => [...es, { id, from, to, fromAnchor, toAnchor }])
    },
    [nextId],
  )

  // 节点 / 表格都可能是连线端点：删除元素时一并摘掉相关连线，
  // 并通知上层同步选中态（拆分前 removeNode / removeTable 的行为）
  const removeNodeWithCleanup = useCallback(
    (id) => {
      setEdges((es) => es.filter((e) => e.from !== id && e.to !== id))
      onNodeRemoved(id)
    },
    [onNodeRemoved],
  )

  const removeTableWithCleanup = useCallback(
    (id) => {
      setEdges((es) => es.filter((e) => e.from !== id && e.to !== id))
      onTableRemoved(id)
    },
    [onTableRemoved],
  )

  const nodeApi = useCanvasNodes({
    initialNodes: initial.nodes,
    nextId,
    onSelect,
    onElementRemoved: removeNodeWithCleanup,
    viewportRef,
    screenToWorld,
  })

  const tableApi = useCanvasTables({
    initialTables: initial.tables,
    nextId,
    onSelect,
    onElementRemoved: removeTableWithCleanup,
    viewportRef,
    screenToWorld,
  })

  const mindApi = useCanvasMindMaps({
    nodes: nodeApi.nodes,
    setNodes: nodeApi.setNodes,
    nextId,
    onSelect,
  })

  // 删除清理需要同步读到最新节点（思维导图整树级联），用 ref 快照
  // 读取而不进依赖数组，避免回调身份随节点变化抖动。
  // useLayoutEffect 在同一提交内同步写入：任何后续指针事件到来前必然已完成
  const nodesRef = useRef(nodeApi.nodes)
  useLayoutEffect(() => {
    nodesRef.current = nodeApi.nodes
  })

  // 批量删除（框选后按 Delete）：框选里可能节点与表格混在一起，
  // 这里不猜 id 前缀，而是让两个集合各过滤一遍 —— 一次事件内完成全部删除。
  // 思维导图节点删除时整棵子树级联删除（含被收起隐藏的后代），
  // 同时修剪幸存导图节点里指向已删节点的 children 引用。
  // 关联连线一把摘掉；选中态交给上层（onElementsRemoved）统一收口，
  // 不再逐个 id 触发 onNodeRemoved / onTableRemoved（那会把主选中反复清空）。
  const { removeNodes, setNodes } = nodeApi
  const { removeTables } = tableApi
  const removeElements = useCallback(
    (ids) => {
      // 先按当前节点快照展开思维导图子树
      const requested = new Set(ids)
      const removed = new Set()
      for (const id of requested) {
        const node = nodesRef.current.find((n) => n.id === id)
        const treeIds = node && isMindNode(node) ? collectMindTreeIds(nodesRef.current, id) : [id]
        for (const treeId of treeIds) removed.add(treeId)
      }
      if (!removed.size) return
      removeNodes([...removed])
      removeTables([...removed])
      // 幸存的导图节点：children 里指向已删节点的引用一并剪掉，
      // 否则布局 / 圆球数量会踩到悬空 id
      const hasDanglingRefs = nodesRef.current.some(
        (n) => isMindNode(n) && !removed.has(n.id) &&
          (n.children || []).some((childId) => removed.has(childId)),
      )
      if (hasDanglingRefs) {
        setNodes((ns) =>
          ns.map((n) => {
            if (!isMindNode(n) || removed.has(n.id)) return n
            const children = n.children
            if (!children || !children.some((childId) => removed.has(childId))) return n
            return { ...n, children: children.filter((childId) => !removed.has(childId)) }
          }),
        )
      }
      setEdges((es) => es.filter((e) => !removed.has(e.from) && !removed.has(e.to)))
      onElementsRemoved([...removed])
    },
    [removeNodes, removeTables, setNodes, onElementsRemoved],
  )

  return {
    nodes: nodeApi.nodes,
    edges,
    tables: tableApi.tables,
    setNodes: nodeApi.setNodes,
    setEdges,
    setTables: tableApi.setTables,
    addNode: nodeApi.addNode,
    addNodeAtCenter: nodeApi.addNodeAtCenter,
    removeNode: nodeApi.removeNode,
    // 批量删除：一次删掉框选命中的全部节点 + 表格（导图子树级联）
    removeElements,
    commitNodeText: nodeApi.commitNodeText,
    // 列表卡片行输入的末行维护（起笔追加 / 擦空收起，见 useCanvasNodes）
    syncListCardTrailingRow: nodeApi.syncListCardTrailingRow,
    toggleListCardItem: nodeApi.toggleListCardItem,
    updateNodeSize: nodeApi.updateNodeSize,
    // 思维导图：建图 / 衍生节点 / 收展 / 整树换色 / 实测尺寸回写（见 useCanvasMindMaps）
    addMindMap: mindApi.addMindMap,
    addMindChild: mindApi.addMindChild,
    toggleMindCollapse: mindApi.toggleMindCollapse,
    setMindTreeStyle: mindApi.setMindTreeStyle,
    measureMindNode: mindApi.measureMindNode,
    addEdge,
    addTable: tableApi.addTable,
    removeTable: tableApi.removeTable,
    updateTableCell: tableApi.updateTableCell,
    clearTableCells: tableApi.clearTableCells,
    pasteTableCells: tableApi.pasteTableCells,
    resizeTableCol: tableApi.resizeTableCol,
    resizeTableRow: tableApi.resizeTableRow,
  }
}
