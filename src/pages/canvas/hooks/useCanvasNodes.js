/* ============================================================
   画布节点 —— 数据与增删改
   ------------------------------------------------------------
   从 useCanvasDocument 拆出的节点专属 hook：
   只持有 nodes 一个 useState，所有写操作都以「不可变更新」产出新数组。
   选中态不在这里：通过 onSelect / onElementRemoved 回调交回上层。
   ============================================================ */

import { useCallback, useState } from 'react'
import {
  CARD_H,
  CARD_W,
  EDIT_FIELD_TEXT,
  EDIT_FIELD_TITLE,
  LIST_CARD_H,
  LIST_CARD_W,
  NOTE_H,
  NOTE_W,
  NODE_H,
  NODE_W,
} from '../lib/constants'
import { cardStyleIdFromKind } from '../../../constants/cardStyles'
import { noteStyleIdFromKind } from '../../../constants/noteStyles'
import {
  LIST_CARD_DEFAULT_ITEMS,
  LIST_CARD_DEFAULT_TITLE,
  listCardStyleIdFromKind,
} from '../../../constants/listCardStyles'

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
    // 初始内容留空：画布上显示占位符（与便签一致），不写入默认文案
    (x, y, text = '', kind = 'muted') => {
      const id = nextId('n')
      // 节点默认尺寸按 kind 分派：便签 200×200、卡片 240×180、列表卡片 240×184，其余 176×76
      const isNote = noteStyleIdFromKind(kind) !== null
      const isCard = cardStyleIdFromKind(kind) !== null
      const isListCard = listCardStyleIdFromKind(kind) !== null
      const w = isNote ? NOTE_W : isCard ? CARD_W : isListCard ? LIST_CARD_W : NODE_W
      const h = isNote ? NOTE_H : isCard ? CARD_H : isListCard ? LIST_CARD_H : NODE_H
      // 全部节点都走「内容自适应」：h 是测量结果，初始下限取默认尺寸，
      // 内容高度待实测（minH / contentH 的含义见 lib/noteSize.js）
      const node = { id, x, y, w, h, minH: h, contentH: 0, kind, text }
      // 卡片节点独有的标题字段（封面色带内编辑），正文仍走 text
      if (isCard) node.title = ''
      // 列表卡片落库即带默认内容（标题 + 待办项拷贝），
      // 待办项按行渲染、勾选框可点击切换（见 ListCardNodeFace）
      if (isListCard) {
        node.title = LIST_CARD_DEFAULT_TITLE
        node.items = LIST_CARD_DEFAULT_ITEMS.map((item) => ({ ...item }))
      }
      setNodes((ns) => [...ns, node])
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

  // 批量删除（框选后按 Delete）：一次 setState 干掉整批，避免逐个 id 反复渲染。
  // 连线清理与选中态收口由 useCanvasDocument / 上层统一负责。
  const removeNodes = useCallback((ids) => {
    const removed = new Set(ids)
    if (!removed.size) return
    setNodes((ns) => ns.filter((n) => !removed.has(n.id)))
  }, [])

  // 节点内容自适应：实测高度回写节点数据（宽高是连线锚点 / 选中框 /
  // 缩略图的几何来源，必须同步落库，否则画布元素会与新盒子错位）。
  // 回写的是 h（实测盒高）与 contentH（内容高度），不会动用户下限 minH
  const updateNodeSize = useCallback((id, patch) => {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }, [])

  // 提交节点文案：按字段分派（卡片标题 → title，其余 → text）。
  // 全部字段允许清空（空内容落库，画布显示占位符）
  const commitNodeText = useCallback((id, raw, field = EDIT_FIELD_TEXT) => {
    const value = raw.trim()
    setNodes((ns) =>
      ns.map((n) => {
        if (n.id !== id) return n
        return field === EDIT_FIELD_TITLE ? { ...n, title: value } : { ...n, text: value }
      }),
    )
  }, [])

  // 列表卡片待办项勾选切换：按行下标取反 done，其余项引用原样保留
  // （数组浅拷贝一层，未命中的项不重建，memo 节点只重渲染被点的卡片）
  const toggleListCardItem = useCallback((id, index) => {
    setNodes((ns) =>
      ns.map((n) => {
        if (n.id !== id || !Array.isArray(n.items)) return n
        return {
          ...n,
          items: n.items.map((item, i) => (i === index ? { ...item, done: !item.done } : item)),
        }
      }),
    )
  }, [])

  return {
    nodes,
    setNodes,
    addNode,
    addNodeAtCenter,
    removeNode,
    removeNodes,
    commitNodeText,
    toggleListCardItem,
    updateNodeSize,
  }
}
