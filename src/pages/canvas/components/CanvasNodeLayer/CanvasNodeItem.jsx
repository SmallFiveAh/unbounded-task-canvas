import { memo, useEffect, useLayoutEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { cardStyleIdFromKind } from '../../../../constants/cardStyles'
import { noteStyleIdFromKind, NOTE_BORDERED_STYLE_IDS } from '../../../../constants/noteStyles'
import cardVisualStyles from '../../../../components/CardStyles/CardStyles.module.css'
import visualStyles from '../../../../components/NoteStyles/NoteStyles.module.css'
import { cornerRadius } from '../../../../utils/canvasRadius'
import {
  CARD_PLACEHOLDER,
  CARD_TITLE_PLACEHOLDER,
  EDIT_FIELD_TEXT,
  EDIT_FIELD_TITLE,
  NODE_PLACEHOLDER,
  NODE_RADIUS,
  NOTE_PLACEHOLDER,
} from '../../lib/constants'
import { measureNoteContentHeight, resolveContentHeight, resolveMinHeight } from '../../lib/noteSize'
import CardNodeFace from './CardNodeFace'
import styles from './CanvasNodeLayer.module.css'

/**
 * 单个画布节点（memo 化）
 * ------------------------------------------------------------
 * 从 CanvasNodeLayer 拆出的展示子组件：拖拽期间只有被拖节点的
 * node 对象身份变化，其余节点因 memo 浅比较通过而整帧跳过渲染
 * （DevTools 打开时，全量重渲染的成本足以把帧预算打爆）。
 * 回调 prop 全部来自上层稳定引用，onPointerDown 在组件内部
 * 再包一层箭头函数不影响 memo 判定（比较的是上层传入的 prop）。
 */
function CanvasNodeItem({
  node,
  selected,
  primary,
  editing,
  editingField,
  draft,
  scale,
  onNodePointerDown,
  onStartEdit,
  onDraftChange,
  onCommitEdit,
  onCancelEdit,
  onNodeSizeChange,
}) {
  // 便签节点：kind 形如 note-<样式id>，额外挂上共享视觉类
  // （纸张底色 / 墨色 / 装饰由 NoteStyles.module.css 统一供给）
  const noteStyleId = noteStyleIdFromKind(node.kind)
  const isNote = noteStyleId !== null
  const noteVisual = visualStyles[noteStyleId || '']
  // 带边框式纸张装饰的便签（小黑板粉笔框等）：
  // 内容加内边距退到装饰边线内侧，避免文字/占位符压住虚线框
  const hasBorderDecor = NOTE_BORDERED_STYLE_IDS.has(noteStyleId)
  // 卡片节点：kind 形如 card-<样式id>，视觉变量由 CardStyles.module.css 供给
  // （封面 / 底色 / 墨色 / 胶囊与面板缩略图同一套 --c-* 变量）
  const cardStyleId = cardStyleIdFromKind(node.kind)
  const isCard = cardStyleId !== null
  const cardVisual = cardVisualStyles[cardStyleId || '']
  // 空内容节点显示占位文案（仅展示，不写入数据）：便签 / 卡片 / 普通节点各有专属文案
  // 卡片的占位显示在正文区；标题为空时封面带只留色带
  const placeholder = isNote ? NOTE_PLACEHOLDER : isCard ? CARD_PLACEHOLDER : NODE_PLACEHOLDER
  const showPlaceholder = !node.text
  // 卡片两个可编辑区域各自的字段：标题（封面带）/ 正文（下方内容区）
  const cardTitle = node.title || ''
  const cardBody = node.text || ''
  const isEditingTitle = editing && editingField === EDIT_FIELD_TITLE
  const isEditingText = editing && editingField !== EDIT_FIELD_TITLE

  // 节点高度自适应（全部节点，机制同便签）：容器 height:auto，由内容撑开；
  // ResizeObserver 把实测高度回写 store（node.h 是连线锚点 /
  // 选中框 / 缩略图的几何来源），实测与已落库值一致时不触发更新，
  // 避免「测量 → 回写 → 再测量」的抖动循环。
  //
  // 高度有两个来源，分两个字段存（见 lib/noteSize.js）：
  // · minH      用户拖动控制点设的下限 —— 唯一参与布局的高度输入
  // · contentH  内容实测高度 —— 只用于「不可缩到内容以下」的判定
  // · h         测量结果 —— 恒等于渲染高度，供选中框 / 连线 / 缩略图读取
  const nodeRef = useRef(null)
  // 已落库的度量经 ref 读取：effect 只依赖节点身份，打字引起的高度变化
  // 全部走测量回调，不重建 ResizeObserver。
  // 用 useLayoutEffect：观察器回调在绘制前触发，必须在此之前拿到最新值，
  // 否则每帧都会拿旧值重复回写一次（缩放拖拽时等于每帧多渲染一轮）
  const metricsRef = useRef({ h: node.h, contentH: resolveContentHeight(node) })
  useLayoutEffect(() => {
    metricsRef.current = { h: node.h, contentH: resolveContentHeight(node) }
  }, [node.h, node.contentH])

  useEffect(() => {
    const el = nodeRef.current
    if (!el) return undefined
    const syncMetrics = () => {
      const boxH = el.offsetHeight
      const contentH = measureNoteContentHeight(el)
      const prev = metricsRef.current
      // 取整比较：亚像素差异（字体度量）不落库，防止高频抖动
      if (boxH === prev.h && Math.abs(contentH - prev.contentH) < 1) return
      onNodeSizeChange(node.id, { h: boxH, contentH })
    }
    const observer = new ResizeObserver(syncMetrics)
    observer.observe(el)
    // 内容节点单独观察：容器被 minH 撑住时，文字增减不会改变容器尺寸，
    // 只盯着容器就量不到内容高度 —— 拖控制点时的下限判定会因此失准
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [node.id, onNodeSizeChange])

  // 编辑态 textarea 自动增高：height:auto 后由 scrollHeight 决定实际高度，
  // 与展示态 span 的换行行为一致（排版属性两态共用一套，见 module.css 注释）
  const inputRef = useRef(null)
  // 卡片标题编辑框 ref（多行 textarea，随内容自动增高）
  const titleInputRef = useRef(null)
  // 用 useLayoutEffect 在绘制前完成增高：先 auto 再由 scrollHeight 定高，
  // 两态（标题 / 正文）都不出现「先按 1 行渲染再被撑高」的闪跳
  useLayoutEffect(() => {
    if (!editing) return
    const autoGrow = (el) => {
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
    autoGrow(inputRef.current)
    autoGrow(titleInputRef.current)
  }, [editing, draft])

  // 编辑态输入框：普通节点与卡片正文共用同一份 textarea
  // （卡片正文排版参考便签：自动增高、Enter 提交、Shift+Enter 换行、Esc 取消）
  const textInput = (
    <textarea
      ref={inputRef}
      className={styles.nodeInput}
      value={draft}
      placeholder={placeholder}
      autoFocus
      rows={2}
      onChange={(e) => onDraftChange(e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onBlur={onCommitEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          onCommitEdit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onCancelEdit()
        }
      }}
    />
  )

  // 卡片标题编辑框：多行 textarea，落在封面带内（flex 垂直居中由带负责），
  // 换行策略与展示态一致（见 .cardTitleInput），高度随内容自动增高
  const titleInput = (
    <textarea
      ref={titleInputRef}
      className={styles.cardTitleInput}
      value={draft}
      placeholder={CARD_TITLE_PLACEHOLDER}
      autoFocus
      rows={1}
      onChange={(e) => onDraftChange(e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onBlur={onCommitEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          onCommitEdit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onCancelEdit()
        }
      }}
    />
  )
  return (
    <div
      ref={nodeRef}
      data-node-id={node.id}
      className={`${styles.node} ${styles[node.kind] || ''}${
        noteVisual ? ` ${noteVisual}` : ''
      }${isNote ? ` ${styles.noteNode}` : ''}${
        hasBorderDecor ? ` ${styles.noteFramed}` : ''
      }${cardVisual ? ` ${cardVisual}` : ''}${
        isCard ? ` ${styles.cardNode}` : ''
      }${selected ? ` ${styles.selected}` : ''}${primary ? ` ${styles.primary}` : ''}`}
      style={{
        // 用 transform 定位而不是 left/top：拖拽每帧只动 x/y，
        // transform 走合成器，跳过整层 reflow + 重绘（box-shadow 很贵）
        transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
        width: node.w,
        // 高度交给内容撑开（minHeight 用「用户下限 minH」兜住手动拉大的下限），
        // 全部节点统一走内容自适应（机制见 lib/noteSize.js）。
        // 注意这里不能再用 node.h —— h 是测量结果，若拿它当 minHeight，
        // 高度就只会增不会减，且与缩放拖拽互相覆盖造成漂移。
        height: 'auto',
        minHeight: resolveMinHeight(node),
        // 圆角随缩放补偿：缩小时至少保留 3.5 个屏幕像素，避免「看起来是直角」
        borderRadius: cornerRadius(NODE_RADIUS, node.w, node.h, scale),
      }}
      onPointerDown={(e) => onNodePointerDown(e, node)}
      // move / up 不挂在这里：按下时指针捕获在节点上，事件会冒泡到视口，
      // 由 useViewportPointer 统一收口（挂两遍会把每次 move 跑两遍）
      onDoubleClick={(e) => {
        e.stopPropagation()
        // 卡片的 dblclick target 会被拖拽的指针捕获重定向成本容器
        // （startItemPointerDown 捕获指针，派生鼠标事件随之重定向），
        // e.target 永远不是封面带/正文区 —— 用命中坐标还原真实元素判区
        if (!isCard) {
          onStartEdit(node)
          return
        }
        const hit = document.elementFromPoint(e.clientX, e.clientY)
        const region = hit?.closest('[data-card-region]')?.dataset.cardRegion
        onStartEdit(node, region === 'title' ? EDIT_FIELD_TITLE : EDIT_FIELD_TEXT)
      }}
    >
      {isCard ? (
        /* 卡片节点：两个可编辑区域交给 CardNodeFace ——
           外层 cardInner 是容器的第一个子元素，内容高度测量以它为单位
           （见 noteSize.js）；编辑中的区域经插槽换成输入框，不拆散包裹层。
           双击封面带 → 编辑标题；双击正文区 → 编辑正文
           （区域判定在容器 onDoubleClick 里按命中坐标完成） */
        <CardNodeFace
          title={cardTitle}
          body={cardBody}
          placeholder={placeholder}
          titlePlaceholder={CARD_TITLE_PLACEHOLDER}
          titleSlot={isEditingTitle ? titleInput : undefined}
          bodySlot={isEditingText ? textInput : undefined}
        />
      ) : editing ? (
        textInput
      ) : (
        <span
          className={`${styles.nodeText}${
            showPlaceholder ? ` ${styles.nodeTextPlaceholder}` : ''
          }`}
        >
          {showPlaceholder ? placeholder : node.text}
        </span>
      )}
    </div>
  )
}

CanvasNodeItem.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.string.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    w: PropTypes.number.isRequired,
    h: PropTypes.number.isRequired,
    kind: PropTypes.string.isRequired,
    text: PropTypes.string,
    // 卡片独有：封面标题带的标题字段
    title: PropTypes.string,
    // 高度自适应度量：用户高度下限 / 内容实测高度（见 lib/noteSize.js）
    minH: PropTypes.number,
    contentH: PropTypes.number,
  }).isRequired,
  selected: PropTypes.bool.isRequired,
  primary: PropTypes.bool.isRequired,
  editing: PropTypes.bool.isRequired,
  // 正在编辑的字段：text（正文，默认）/ title（卡片标题）
  editingField: PropTypes.string,
  draft: PropTypes.string,
  scale: PropTypes.number.isRequired,
  onNodePointerDown: PropTypes.func.isRequired,
  onStartEdit: PropTypes.func.isRequired,
  onDraftChange: PropTypes.func.isRequired,
  onCommitEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onNodeSizeChange: PropTypes.func.isRequired,
}

export default memo(CanvasNodeItem)
