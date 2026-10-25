/* ============================================================
   思维导图文档动作 —— 建图 / 衍生节点 / 收展 / 尺寸回写
   ------------------------------------------------------------
   从 useCanvasDocument 再拆出的导图专属 hook：只持有 setNodes
   的写入权，所有变更都以「一次不可变 setNodes」完成（数据变更
   与自动布局在同一帧内生效，不产生中间态）。

   布局时机：
   · 新建 / 衍生节点：落库瞬间按估计尺寸排布（估计值见 mindMap.js），
     渲染后实测尺寸经 measureMindNode 回写并再次自动布局，随即收敛；
   · 收起 / 展开 / 文案改变导致节点尺寸变化：都走 measureMindNode
     或 toggleMindCollapse 里的自动布局。
   ============================================================ */

import { useCallback } from 'react'
import {
  MIND_BRANCH_EST_H,
  MIND_BRANCH_EST_W,
  MIND_BRANCH_TEXT,
  MIND_NEW_BRANCH_TEXT,
  MIND_ROOT_EST_H,
  MIND_ROOT_EST_W,
  MIND_ROOT_TEXT,
  mindKind,
} from '../../../constants/mindMap'
import { applyMindLayout, collectMindTreeIds, isMindNode } from '../lib/mindLayout'
import { useLatestPropsRef } from './useLatestPropsRef'

/**
 * @param {object} params
 * @param {Array<object>} params.nodes           画布节点（经 ref 读最新值，回调身份稳定）
 * @param {Function} params.setNodes             节点集合写入（useCanvasNodes 提供）
 * @param {(prefix: string) => string} params.nextId id 生成器
 * @param {(id: string) => void} params.onSelect 新节点落地后同步选中
 */
export function useCanvasMindMaps({ nodes, setNodes, nextId, onSelect }) {
  const latestRef = useLatestPropsRef({ nodes, setNodes })

  /** 创建一个导图节点（估计尺寸落库，实测尺寸随后回写） */
  const createMindNode = useCallback(
    (id, x, y, kind, text, parentId, children, collapsed = false) => ({
      id,
      x,
      y,
      w: 0,
      h: 0,
      kind,
      text,
      parentId,
      children,
      collapsed,
    }),
    [],
  )

  /**
   * 在 (x, y)（根节点中心，世界坐标）落一棵默认结构的导图：
   * 根「主题」+ 三条一级分支「分支」，与面板缩略图同构。
   * @param {number} x        根节点中心 x（世界坐标）
   * @param {number} y        根节点中心 y（世界坐标）
   * @param {string} styleId  导图样式 id
   * @param {object} [sizes]  拖拽幽灵实测的默认节点尺寸
   *   （{ rootW, rootH, branchW, branchH }）。传入时首帧排布即最终排布，
   *   与松手前的预览逐像素一致；缺省才回落到估计值。
   * @returns {string} 根节点 id
   */
  const addMindMap = useCallback(
    (x, y, styleId, sizes) => {
      const { current: latest } = latestRef
      const kind = mindKind(styleId)
      const rootW = sizes?.rootW ?? MIND_ROOT_EST_W
      const rootH = sizes?.rootH ?? MIND_ROOT_EST_H
      const branchW = sizes?.branchW ?? MIND_BRANCH_EST_W
      const branchH = sizes?.branchH ?? MIND_BRANCH_EST_H
      const rootId = nextId('n')
      const childIds = [nextId('n'), nextId('n'), nextId('n')]
      const root = createMindNode(
        rootId,
        x - rootW / 2,
        y - rootH / 2,
        kind,
        MIND_ROOT_TEXT,
        null,
        childIds,
      )
      root.w = rootW
      root.h = rootH
      // 三条分支先按同一组尺寸纵向排开，自动布局随后校正
      const children = childIds.map((id, i) => {
        const child = createMindNode(
          id,
          0,
          root.y + i * (branchH + 14),
          kind,
          MIND_BRANCH_TEXT,
          rootId,
          [],
        )
        child.w = branchW
        child.h = branchH
        return child
      })
      latest.setNodes((ns) => applyMindLayout([...ns, root, ...children]))
      onSelect(rootId)
      return rootId
    },
    [latestRef, nextId, onSelect, createMindNode],
  )

  /**
   * 给任意导图节点衍生一个子节点（可无限向下延伸）。
   * @returns {string} 新节点 id
   */
  const addMindChild = useCallback(
    (parentId) => {
      const { current: latest } = latestRef
      const parent = latest.nodes.find((n) => n.id === parentId)
      if (!parent) return null
      const childId = nextId('n')
      const child = createMindNode(
        childId,
        parent.x + parent.w + 48,
        parent.y,
        parent.kind,
        MIND_NEW_BRANCH_TEXT,
        parentId,
        [],
      )
      child.w = MIND_BRANCH_EST_W
      child.h = MIND_BRANCH_EST_H
      latest.setNodes((ns) =>
        applyMindLayout(
          ns.map((n) =>
            n.id === parentId
              ? { ...n, children: [...(n.children || []), childId], collapsed: false }
              : n,
          ).concat(child),
        ),
      )
      onSelect(childId)
      return childId
    },
    [latestRef, nextId, onSelect, createMindNode],
  )

  /** 收起 / 展开某节点的下一代（后代节点随祖先的收起状态级联隐藏） */
  const toggleMindCollapse = useCallback(
    (nodeId) => {
      const { current: latest } = latestRef
      latest.setNodes((ns) =>
        applyMindLayout(
          ns.map((n) => (n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n)),
        ),
      )
    },
    [latestRef],
  )

  /**
   * 整树换样式（颜色）：把 nodeId 所在导图树全部节点的 kind 换成新样式。
   * 单击导图节点弹出的样式面板里选样式时走这里 —— 只记默认值不改树，
   * 颜色就永远落不了库。kind 变化经 setNodes 不可变更新随既有持久化
   * 链路落盘；ResizeObserver 会重新实测尺寸并触发自动布局
   * （见 measureMindNode），这里无需重排。
   */
  const setMindTreeStyle = useCallback(
    (nodeId, styleId) => {
      const { current: latest } = latestRef
      const kind = mindKind(styleId)
      latest.setNodes((ns) => {
        if (!isMindNode(ns.find((n) => n.id === nodeId))) return ns
        const treeIds = new Set(collectMindTreeIds(ns, nodeId))
        let changed = false
        const next = ns.map((n) => {
          if (!treeIds.has(n.id) || n.kind === kind) return n
          changed = true
          return { ...n, kind }
        })
        return changed ? next : ns
      })
    },
    [latestRef],
  )

  /**
   * 实测尺寸回写 + 自动布局：渲染层 ResizeObserver 量出节点真实
   * w / h 后走这里 —— 尺寸变化会影响整棵树的排布，所以测量与
   * 重排在同一次 setNodes 里完成。
   *
   * 根节点额外做「中心保持」补偿：落库时按估计尺寸把根中心对齐
   * 光标 / 拖拽幽灵，实测尺寸与估计值有偏差时，若只改 w/h，根中心
   * 会随之漂移（幽灵在光标处、落库后的导图却偏了一截）。这里把
   * 尺寸增量的一半反向补给 x / y，根中心始终钉在落点。
   */
  const measureMindNode = useCallback(
    (id, patch) => {
      const { current: latest } = latestRef
      latest.setNodes((ns) => {
        const target = ns.find((n) => n.id === id)
        if (!target) return ns
        if (
          (patch.w === undefined || patch.w === target.w) &&
          (patch.h === undefined || patch.h === target.h)
        ) {
          return ns
        }
        return applyMindLayout(
          ns.map((n) => {
            if (n.id !== id) return n
            const next = { ...n, ...patch }
            if (!n.parentId) {
              // 根节点：左缘 / 上缘反向让出尺寸差的一半，保持中心不动
              if (patch.w !== undefined) next.x = n.x - (patch.w - n.w) / 2
              if (patch.h !== undefined) next.y = n.y - (patch.h - n.h) / 2
            }
            return next
          }),
        )
      })
    },
    [latestRef],
  )

  return { addMindMap, addMindChild, toggleMindCollapse, setMindTreeStyle, measureMindNode }
}
