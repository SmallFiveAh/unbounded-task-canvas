/* ============================================================
   便签尺寸度量 —— 纯函数（不依赖 React）
   ------------------------------------------------------------
   便签的高度有两个来源，必须分开存，绝不能共用一个字段：
   · minH      用户拖动控制点设定的「下限」（用户意图）
   · contentH  内容实测高度（由 ResizeObserver 量出）
   渲染高度 = max(minH, contentH)，交给浏览器按 height:auto 自动得出；
   node.h 只作为「实测结果」被回写，绝不反过来参与布局。

   为什么必须分开：一旦让 h 自己当 minHeight，h 就会同时扮演
   「下限」和「结果」两个角色 ——
   · 内容变长 → 量到更大的 h → 下限跟着抬高 → 内容再删短也缩不回去（单向自锁）
   · 缩放拖拽写入的 h 与观察器回写的 h 互相覆盖 → 盒子漂移
   ============================================================ */

/** 便签有效高度（世界坐标）：内容高度与用户下限取大者 */
export function noteHeight(minH, contentH) {
  return Math.max(minH, contentH)
}

/** 用户下限：老存档没有 minH 时回落为当前高度，保持外观不变 */
export function resolveMinHeight(node) {
  return typeof node.minH === 'number' ? node.minH : node.h
}

/** 内容实测高度：老存档没有该字段时按 0 处理（挂载后立刻会被量到真值） */
export function resolveContentHeight(node) {
  return typeof node.contentH === 'number' ? node.contentH : 0
}

/**
 * 便签盒子的「内容高度」：内容节点高度 + 容器的上下内边距与边框。
 * 为什么量子节点而不是量容器？容器高度 = max(minH, contentH)，
 * 用户把便签拉得比内容高时，容器高度已经不代表内容高度了。
 * @param {HTMLElement} el 便签容器
 * @returns {number} 世界坐标下的内容高度（含容器内边距与边框）
 */
export function measureNoteContentHeight(el) {
  const content = el.firstElementChild
  if (!content) return 0
  const cs = getComputedStyle(el)
  const extraY =
    parseFloat(cs.paddingTop) +
    parseFloat(cs.paddingBottom) +
    parseFloat(cs.borderTopWidth) +
    parseFloat(cs.borderBottomWidth)
  return Math.ceil(content.offsetHeight + extraY)
}
