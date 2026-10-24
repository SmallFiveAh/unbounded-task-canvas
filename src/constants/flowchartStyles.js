/* ============================================================
   流程图节点枚举
   ------------------------------------------------------------
   流程图标准符号的「节点 id + 名称 + 形状」清单，供
   FlowChartStylePanel 面板缩略图展示 / 选中。只收标准基本
   节点（起止 / 处理 / 判断 / 输入输出 / 子流程），不夹带
   私货节点。形状由 shape 枚举驱动 SVG 渲染。
   ============================================================ */

/** 节点形状枚举：与面板内的 SVG 渲染一一对应 */
export const FLOW_CHART_SHAPES = {
  TERMINATOR: 'terminator', // 起止框：圆角胶囊
  PROCESS: 'process', // 处理框：矩形
  DECISION: 'decision', // 判断框：菱形
  INPUT_OUTPUT: 'inputOutput', // 输入/输出框：平行四边形
  SUBPROCESS: 'subprocess', // 子流程框：双竖线矩形
}

export const FLOW_CHART_NODES = [
  { id: 'terminator', label: '开始 / 结束', shape: FLOW_CHART_SHAPES.TERMINATOR },
  { id: 'process', label: '处理', shape: FLOW_CHART_SHAPES.PROCESS },
  { id: 'decision', label: '判断', shape: FLOW_CHART_SHAPES.DECISION },
  { id: 'inputOutput', label: '输入 / 输出', shape: FLOW_CHART_SHAPES.INPUT_OUTPUT },
  { id: 'subprocess', label: '子流程', shape: FLOW_CHART_SHAPES.SUBPROCESS },
]

export const DEFAULT_FLOW_CHART_NODE_ID = FLOW_CHART_NODES[0].id

const FLOW_CHART_NODE_ID_SET = new Set(FLOW_CHART_NODES.map((n) => n.id))

/* ---------- 已选节点的本地记忆（面板关了也记得住） ---------- */

export const FLOW_CHART_NODE_STORAGE_KEY = 'canvas.flowChartNode'

/** 读取上次选中的流程图节点；无存档或值非法时回退默认节点 */
export function loadStoredFlowChartNodeId() {
  try {
    const stored = window.localStorage.getItem(FLOW_CHART_NODE_STORAGE_KEY)
    if (FLOW_CHART_NODE_ID_SET.has(stored)) return stored
  } catch {
    /* 隐私模式等拿不到 localStorage：静默回退默认节点 */
  }
  return DEFAULT_FLOW_CHART_NODE_ID
}

/** 记住本次选中的流程图节点（写不进去也不影响本次会话使用） */
export function saveStoredFlowChartNodeId(nodeId) {
  try {
    window.localStorage.setItem(FLOW_CHART_NODE_STORAGE_KEY, nodeId)
  } catch {
    /* 同上，忽略持久化失败 */
  }
}
