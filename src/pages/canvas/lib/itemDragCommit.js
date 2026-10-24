/* ============================================================
   元素拖拽的纯计算（不依赖 React）
   ------------------------------------------------------------
   · collectDragStarts：拖拽起点登记 —— 记录所有选中元素（节点 + 表格）
     的初始位置，一起拖拽；索引在拖拽开始时建好，move 高频期间只查 Map
   · commitDragMove：把最近一次指针位置应用到所有被拖元素
     （rAF 回调与松手收口共用）
   ============================================================ */

/**
 * @param {string[]} selected 选中元素 id 集合
 * @param {Array} nodes 节点列表
 * @param {Array} tables 表格列表
 * @returns {{ nodeStarts: Map, tableStarts: Map }}
 */
export function collectDragStarts(selected, nodes, tables) {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const tableById = new Map(tables.map((t) => [t.id, t]))
  return {
    nodeStarts: new Map(
      selected.filter((id) => nodeById.has(id)).map((id) => [id, nodeById.get(id)]),
    ),
    tableStarts: new Map(
      selected.filter((id) => tableById.has(id)).map((id) => [id, tableById.get(id)]),
    ),
  }
}

/**
 * 点击选中语义（与拆分前一致）：
 * Ctrl/⌘ 单击 → 把元素加入或移出选区；点击已选中元素 → 整组保持不变；
 * 点击未选中元素 → 仅选中它。
 * @param {string} clickedId 被点击的元素 id
 * @param {string[]} curSelected 当前选中集合
 * @param {boolean} additive 是否按住 Ctrl/⌘
 * @returns {{ selected: string[], primaryId: string|null }} 新选区与主选中元素
 */
export function resolvePressSelection(clickedId, curSelected, additive) {
  let selected
  if (additive) {
    selected = curSelected.includes(clickedId)
      ? curSelected.filter((id) => id !== clickedId)
      : [...curSelected, clickedId]
  } else if (curSelected.includes(clickedId)) {
    selected = curSelected
  } else {
    selected = [clickedId]
  }
  // 主选中元素：点中的元素本身；被 Ctrl 取消选中时退而取选区最后一个
  const primaryId = selected.includes(clickedId)
    ? clickedId
    : (selected[selected.length - 1] ?? null)
  return { selected, primaryId }
}

/**
 * 构造拖拽手势状态：起点指针 / 起点定格的缩放比 / 各元素起点 / 最新指针位置。
 * 拖拽期间视口不动（平移/缩放与元素拖拽互斥），缩放比在起点定格。
 * @param {PointerEvent} e 按下事件
 * @param {string[]} selected 新选区（节点 + 表格）
 * @param {object} latest 最新 props 快照（nodes / tables / view / setNodes / setTables）
 */
export function createDragState(e, selected, latest) {
  return {
    px: e.clientX,
    py: e.clientY,
    scale: latest.view.scale,
    ...collectDragStarts(selected, latest.nodes, latest.tables),
    latestX: e.clientX,
    latestY: e.clientY,
    raf: 0,
    setNodes: latest.setNodes,
    setTables: latest.setTables,
  }
}

/**
 * @param {object} drag 拖拽手势状态（起点指针 / 缩放比 / 各元素起点 / 最新指针位置）
 */
export function commitDragMove(drag) {
  const dx = (drag.latestX - drag.px) / drag.scale
  const dy = (drag.latestY - drag.py) / drag.scale
  if (drag.nodeStarts.size) {
    drag.setNodes((ns) =>
      ns.map((n) => {
        const s = drag.nodeStarts.get(n.id)
        return s ? { ...n, x: s.x + dx, y: s.y + dy } : n
      }),
    )
  }
  if (drag.tableStarts.size) {
    drag.setTables((ts) =>
      ts.map((t) => {
        const s = drag.tableStarts.get(t.id)
        return s ? { ...t, x: s.x + dx, y: s.y + dy } : t
      }),
    )
  }
}
