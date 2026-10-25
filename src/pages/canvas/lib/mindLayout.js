/* ============================================================
   思维导图布局与派生数据 —— 纯函数（不依赖 React）
   ------------------------------------------------------------
   导图是一棵「向右生长」的逻辑树（根在左，子代向右扇出），
   与常见导图产品一致：子代整体在父代右侧垂直居中，兄弟子树
   纵向依次堆叠。节点不拖动换位，位置完全由本文件计算。

   约定：
   · 每个导图节点的 w / h 是实测值（渲染后回写），布局用它排列；
     根节点的位置是「整棵树的锚点」（整树拖动 = 平移所有节点），
     重排时根节点保持原位、子代围绕它重新居中。
   · collapsed 节点按叶子参与布局，其后代节点整体隐藏：
     不渲染、不参与连线命中、不可被框选（collectHiddenMindIds）。
   ============================================================ */

import {
  isMindKind,
  mindStyleIdFromKind,
  MIND_HGAP,
  MIND_VGAP,
} from '../../../constants/mindMap'

/** 是否思维导图节点（guard：容忍存档里的脏数据缺 kind） */
export const isMindNode = (node) => Boolean(node && isMindKind(node.kind))

/** id → 导图节点 的索引（仅思维导图节点） */
export function buildMindIndex(nodes) {
  const index = new Map()
  for (const node of nodes) {
    if (isMindNode(node)) index.set(node.id, node)
  }
  return index
}

/**
 * nodeId 所在整棵导图树的全部节点 id（含自己；含被收起隐藏的后代）。
 * 整树拖动用：拖任何一个导图节点，整棵树一起平移。
 * 非思维导图节点返回 [nodeId]。
 */
export function collectMindTreeIds(nodes, nodeId) {
  const index = buildMindIndex(nodes)
  const self = index.get(nodeId)
  if (!self) return [nodeId]
  // 自底向上找到根
  let root = self
  while (root.parentId) {
    root = index.get(root.parentId)
    if (!root) break // 父节点缺失（脏数据）：以当前节点为根兜底
  }
  const ids = []
  const walk = (node) => {
    ids.push(node.id)
    for (const childId of node.children || []) {
      const child = index.get(childId)
      if (child) walk(child)
    }
  }
  walk(root)
  return ids
}

/**
 * 被收起而隐藏的导图节点 id 集合：任一祖先 collapsed 的节点都不可见
 * （collapsed 节点本身仍然可见 —— 圆球上要显示被收起的后代数量）。
 */
export function collectHiddenMindIds(nodes) {
  const index = buildMindIndex(nodes)
  const hidden = new Set()
  const walk = (node, isHidden) => {
    for (const childId of node.children || []) {
      const child = index.get(childId)
      if (!child) continue
      const childHidden = isHidden || Boolean(node.collapsed)
      if (childHidden) hidden.add(child.id)
      walk(child, childHidden)
    }
  }
  for (const node of index.values()) {
    if (!node.parentId) walk(node, false)
  }
  return hidden
}

/**
 * 渲染层的每节点派生信息：
 * · descendantCount  数据树里的全部后代数量（含被收起隐藏的）—— 收起圆球上的数字
 * · branchVar        分支颜色 CSS 变量（--mm-b1/b2/b3）：一级分支按在根 children
 *                    里的下标取色并循环，更深的层级继承所属一级分支的颜色
 * · hasChildren      是否存在下一代（决定悬停时是否显示收起圆球）
 */
export function buildMindMeta(nodes) {
  const index = buildMindIndex(nodes)
  const meta = new Map()
  const resolveBranchVar = (node) => {
    let current = node
    // 自底向上走到一级分支（父节点是根）或根
    while (current.parentId) {
      const parent = index.get(current.parentId)
      if (!parent) return null
      if (!parent.parentId) {
        const indexAt = (parent.children || []).indexOf(current.id)
        return indexAt >= 0 ? `--mm-b${(indexAt % 3) + 1}` : '--mm-b1'
      }
      current = parent
    }
    return null // 根节点自身没有分支颜色
  }
  const countDescendants = (node) => {
    let total = 0
    for (const childId of node.children || []) {
      const child = index.get(childId)
      if (!child) continue
      total += 1 + countDescendants(child)
    }
    return total
  }
  for (const node of index.values()) {
    meta.set(node.id, {
      descendantCount: countDescendants(node),
      branchVar: resolveBranchVar(node),
      hasChildren: (node.children || []).length > 0,
    })
  }
  return meta
}

/* ---------- 自动布局 ---------- */

/** 子树高度：collapsed / 叶子 = 自身高度；否则 = max(自身, 子代块高度) */
function subtreeHeight(node, index) {
  const childIds = node.collapsed ? [] : node.children || []
  if (!childIds.length) return node.h
  let blockH = 0
  childIds.forEach((childId, i) => {
    const child = index.get(childId)
    if (!child) return
    blockH += subtreeHeight(child, index)
    if (i < childIds.length - 1) blockH += MIND_VGAP
  })
  return Math.max(node.h, blockH)
}

/** 递归放置：x 直接排在父代右侧；y 以「子树块」为单位围绕父代垂直居中 */
function place(node, x, blockTop, index, positions) {
  const subtreeH = subtreeHeight(node, index)
  positions.set(node.id, { x, y: blockTop + (subtreeH - node.h) / 2 })
  const childIds = node.collapsed ? [] : node.children || []
  if (!childIds.length) return
  const childSubtrees = []
  for (const childId of childIds) {
    const child = index.get(childId)
    if (!child) continue
    childSubtrees.push({ child, h: subtreeHeight(child, index) })
  }
  if (!childSubtrees.length) return
  // 子代块高度 = 各子树高度之和 + 子树之间的垂直间距
  const childBlockH =
    childSubtrees.reduce((sum, { h }) => sum + h, 0) +
    MIND_VGAP * (childSubtrees.length - 1)
  const childBlockTop = blockTop + (subtreeH - childBlockH) / 2
  let cursor = childBlockTop
  for (const { child, h } of childSubtrees) {
    place(child, x + node.w + MIND_HGAP, cursor, index, positions)
    cursor += h + MIND_VGAP
  }
}

/**
 * 计算全部可见导图节点的新位置（根保持原位，子代围绕根重新居中）。
 * @returns {Map<string, {x:number, y:number}>} id → 新左上角（只含可见节点）
 */
export function layoutMindTrees(nodes) {
  const index = buildMindIndex(nodes)
  const positions = new Map()
  for (const node of index.values()) {
    if (node.parentId) continue
    // 根节点是整棵树的锚点：把它当前的「中心」作为子树块中心传入，
    // 无论子树多高，根节点自己的位置都纹丝不动（重复重排不漂移）
    const subtreeH = subtreeHeight(node, index)
    place(node, node.x, node.y + node.h / 2 - subtreeH / 2, index, positions)
  }
  return positions
}

/**
 * 把布局结果应用回节点数组：位置有变化的才生成新对象，
 * 未命中的节点引用原样保留（memo 浅比较友好）。
 * @returns {Array} 新节点数组（无变化时原数组原样返回）
 */
export function applyMindLayout(nodes) {
  const positions = layoutMindTrees(nodes)
  if (!positions.size) return nodes
  let changed = false
  const next = nodes.map((node) => {
    const pos = positions.get(node.id)
    if (!pos || (pos.x === node.x && pos.y === node.y)) return node
    changed = true
    return { ...node, x: pos.x, y: pos.y }
  })
  return changed ? next : nodes
}

/**
 * 父 → 子的分支连线（三次贝塞尔，水平 S 形，与面板缩略图同款弧线）：
 * 起点在父节点右缘中点，终点在子节点左缘中点，控制点沿水平方向外扩。
 * 被收起隐藏的节点不参与绘制。
 * @returns {Array<{id:string, styleId:string, varName:string, d:string}>}
 */
export function buildMindBranchViews(nodes, hiddenMindIds) {
  const index = buildMindIndex(nodes)
  const meta = buildMindMeta(nodes)
  const views = []
  for (const node of index.values()) {
    if (!node.parentId) continue
    const parent = index.get(node.parentId)
    if (!parent) continue
    if (hiddenMindIds?.has(node.id) || hiddenMindIds?.has(parent.id)) continue
    const x1 = parent.x + parent.w
    const y1 = parent.y + parent.h / 2
    const x2 = node.x
    const y2 = node.y + node.h / 2
    const k = Math.min(Math.max(Math.abs(x2 - x1) * 0.5, 14), 80)
    views.push({
      id: node.id,
      styleId: mindStyleIdFromKind(node.kind) || '',
      varName: meta.get(node.id)?.branchVar || '--mm-b1',
      d: `M ${x1} ${y1} C ${x1 + k} ${y1}, ${x2 - k} ${y2}, ${x2} ${y2}`,
    })
  }
  return views
}
