import { useLayoutEffect, useMemo, useState } from 'react'
import {
  MIND_BRANCH_EST_H,
  MIND_BRANCH_EST_W,
  MIND_BRANCH_TEXT,
  MIND_ROOT_EST_H,
  MIND_ROOT_EST_W,
  MIND_ROOT_TEXT,
  mindKind,
} from '../../constants/mindMap'
import {
  buildMindBranchViews,
  buildMindMeta,
  layoutMindTrees,
} from '../../pages/canvas/lib/mindLayout'

/** 构建默认导图树虚拟节点（根「主题」+ 三条「分支」），
 *  与 useCanvasMindMaps.addMindMap 落库结构完全同构。 */
function buildDefaultTree(styleId) {
  const kind = mindKind(styleId)
  const rootId = 'ghost-root'
  const childIds = ['ghost-c1', 'ghost-c2', 'ghost-c3']
  const root = {
    id: rootId,
    x: 0,
    y: 0,
    w: MIND_ROOT_EST_W,
    h: MIND_ROOT_EST_H,
    kind,
    text: MIND_ROOT_TEXT,
    parentId: null,
    children: childIds,
    collapsed: false,
  }
  const children = childIds.map((id) => ({
    id,
    x: 0,
    y: 0,
    w: MIND_BRANCH_EST_W,
    h: MIND_BRANCH_EST_H,
    kind,
    text: MIND_BRANCH_TEXT,
    parentId: rootId,
    children: [],
    collapsed: false,
  }))
  return [root, ...children]
}

/** 实测节点尺寸回写：与画布 useNodeAutoHeight 同理读取 offsetWidth / offsetHeight，
 *  保证幽灵与落库后节点逐像素一致。
 *  onMeasure 把最新实测值上报给拖拽 hook：落库建图时直接用这组尺寸，
 *  首帧排布就与幽灵完全一致，不会出现「落库后再实测重排」的跳动。 */
function useGhostMeasure(containerRef, styleId, onMeasure) {
  const [sizes, setSizes] = useState(null)
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const rootEl = el.querySelector('[data-ghost-node="ghost-root"]')
    const c1El = el.querySelector('[data-ghost-node="ghost-c1"]')
    if (!rootEl || !c1El) return
    const next = {
      rootW: rootEl.offsetWidth,
      rootH: rootEl.offsetHeight,
      branchW: c1El.offsetWidth,
      branchH: c1El.offsetHeight,
    }
    onMeasure?.(next)
    setSizes((prev) => {
      if (
        prev &&
        prev.rootW === next.rootW &&
        prev.rootH === next.rootH &&
        prev.branchW === next.branchW &&
        prev.branchH === next.branchH
      ) {
        return prev
      }
      return next
    })
  }, [containerRef, styleId, onMeasure])
  return sizes
}

/**
 * 整棵幽灵导图的派生数据：布局后节点 / 分支连线 / 元信息 / 根中心偏移 / 包围盒。
 * 尺寸先用估计值，首帧渲染后经 useGhostMeasure 实测校正并重新自动布局，
 * 与画布落库 → 测量 → 重排的链路完全一致。
 *
 * @param {string} styleId          导图样式 id（决定 kind 与颜色变量）
 * @param {object|null} sizes       useGhostMeasure 返回的实测尺寸
 * @returns {object} { laidOut, branchViews, metas, rootCenterX, rootCenterY, bbox }
 */
export function useGhostMindTree(styleId, sizes) {
  const tree = useMemo(() => buildDefaultTree(styleId), [styleId])
  const rootW = sizes?.rootW ?? MIND_ROOT_EST_W
  const rootH = sizes?.rootH ?? MIND_ROOT_EST_H
  const branchW = sizes?.branchW ?? MIND_BRANCH_EST_W
  const branchH = sizes?.branchH ?? MIND_BRANCH_EST_H

  const laidOut = useMemo(() => {
    const nodes = tree.map((n) =>
      n.id === 'ghost-root'
        ? { ...n, w: rootW, h: rootH }
        : { ...n, w: branchW, h: branchH },
    )
    const positions = layoutMindTrees(nodes)
    return nodes.map((n) => ({ ...n, ...positions.get(n.id) }))
  }, [tree, rootW, rootH, branchW, branchH])

  const branchViews = useMemo(() => buildMindBranchViews(laidOut), [laidOut])
  const metas = useMemo(() => buildMindMeta(laidOut), [laidOut])

  const root = laidOut[0]
  const rootCenterX = root.x + root.w / 2
  const rootCenterY = root.y + root.h / 2

  const bbox = useMemo(() => {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const n of laidOut) {
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x + n.w)
      maxY = Math.max(maxY, n.y + n.h)
    }
    return { w: maxX - minX, h: maxY - minY }
  }, [laidOut])

  return { laidOut, branchViews, metas, rootCenterX, rootCenterY, bbox }
}

export { useGhostMeasure }
