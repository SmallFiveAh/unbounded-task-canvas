/* ============================================================
   思维导图节点语义常量
   ------------------------------------------------------------
   思维导图不是「一个大节点对象」，而是落在画布节点体系里的
   一棵节点树：每个导图节点都是一个普通画布节点（kind 形如
   mind-<样式id>，颜色变量由 MindMapStyles.module.css 注入），
   额外携带树结构字段：
   · parentId  父节点 id（根节点为 null）
   · children  子节点 id 数组（有序，布局与分支颜色都按它来）
   · collapsed 收起态：后代节点整体隐藏，圆球上显示被收起数量

   视觉枚举（10 种样式 id）在 mindMapStyles.js；这里只放
   结构 / 文案 / 布局间距等语义值。
   ============================================================ */

export const MIND_ROOT_TEXT = '主题' // 新建导图的根节点文案
export const MIND_BRANCH_TEXT = '分支' // 新建导图的一级分支文案（与面板缩略图一致：根 + 三分支）
export const MIND_NEW_BRANCH_TEXT = '新分支' // 圆球「加节点」衍生出的节点文案
export const MIND_NODE_PLACEHOLDER = '节点...' // 导图节点编辑态空内容的占位文案（仅展示，不落库）

/* ---------- 自动布局（世界坐标，参考常见导图产品的右侧扇出布局） ---------- */
export const MIND_HGAP = 48 // 父子节点之间的水平间距
export const MIND_VGAP = 14 // 兄弟 / 子树之间的垂直间距

/* ---------- 节点自适应用的尺寸下限（世界坐标） ---------- */
export const MIND_ROOT_MIN_W = 76 // 根节点（主题胶囊）最小宽度
export const MIND_ROOT_MIN_H = 34
export const MIND_BRANCH_MIN_W = 48 // 分支节点（文本条）最小宽度
export const MIND_BRANCH_MIN_H = 28
export const MIND_MAX_TEXT_W = 200 // 文本条最大内容宽度：超出换行，节点随内容增高

/* ---------- 落库前的初始尺寸估计 ----------
   节点真实大小由渲染后实测回写（见 useNodeAutoHeight 的 measureWidth），
   估计值只用于落库瞬间的布局定位，量准后自动布局会立即收敛。
   数值与 MindNodeFace.module.css 的默认内容对齐（根胶囊最小 76×34、
   分支文本条「分支」两字 50×28），保证首帧排布就与拖拽预览一致，
   落库后不再重排跳动；幽灵实测尺寸可用时以实测值为准。 */
export const MIND_ROOT_EST_W = 76
export const MIND_ROOT_EST_H = 34
export const MIND_BRANCH_EST_W = 50
export const MIND_BRANCH_EST_H = 28

/* ---------- 小圆球（收起/展开 与 加节点） ---------- */
export const MIND_BALL_SIZE = 16 // 圆球直径（世界坐标）
export const MIND_BALL_GAP = 2 // 节点右缘到首个圆球 / 两球之间的间距（世界坐标）

const MIND_KIND_PREFIX = 'mind-'

/** 样式 id → 节点 kind（与便签 / 卡片的 kind 约定同构） */
export const mindKind = (styleId) => `${MIND_KIND_PREFIX}${styleId}`

/** 节点 kind → 样式 id；非思维导图节点返回 null */
export function mindStyleIdFromKind(kind) {
  return typeof kind === 'string' && kind.startsWith(MIND_KIND_PREFIX)
    ? kind.slice(MIND_KIND_PREFIX.length)
    : null
}

/** 是否思维导图节点 */
export const isMindKind = (kind) => mindStyleIdFromKind(kind) !== null
