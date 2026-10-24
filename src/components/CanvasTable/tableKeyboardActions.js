/* ============================================================
   表格按键动作（纯函数，不依赖 React）
   ------------------------------------------------------------
   从 useTableKeyboard 拆出的按键语义：
   · shouldTakeOver   焦点 / 接管判定（编辑中不接管、焦点不在表格内
                      时只有「主选中表格」接管，避免多选几张表时同一次
                      按键被每张表各处理一遍）
   · handleClipboardCombo Ctrl/⌘ + C / X / V（放最先，否则带修饰键的
                      字母会被当成输入字符吞掉 —— 之前复制不生效的原因）
   · handleMoveKey    方向键 / Tab / Enter / Delete / Esc / 直接输入字符
   ============================================================ */

import { cellKey, keyToCoord, rectKeys } from './tableGeometry'

/** 移动目标夹到网格范围内（越界停在边缘） */
function clampToGrid(rows, cols, r, c) {
  return {
    r: Math.min(rows - 1, Math.max(0, r)),
    c: Math.min(cols - 1, Math.max(0, c)),
  }
}

/** 移动光标；Shift 时锚点固定、只移动另一端，形成矩形选区 */
function moveCursor(ctx, to, { extend, additive }) {
  if (extend) {
    const from = ctx.anchor ?? ctx.cursor
    const next = additive ? new Set(ctx.selection) : new Set()
    rectKeys(from.r, from.c, to.r, to.c).forEach((k) => next.add(k))
    ctx.setSelection(next)
    ctx.setAnchor(from)
  } else {
    ctx.setSelection(new Set([cellKey(to.r, to.c)]))
    ctx.setAnchor(to)
  }
  ctx.setCursor(to)
}

/** 方向键 / Tab 移动光标，Enter 进入编辑，Delete/Backspace 清空选区，Esc 取消选中 */
function handleMoveKey(ctx, e) {
  const { r, c } = ctx.cursor
  const extend = e.shiftKey
  const additive = e.ctrlKey || e.metaKey

  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault()
      return moveCursor(ctx, clampToGrid(ctx.rows, ctx.cols, r - 1, c), { extend, additive })
    case 'ArrowDown':
      e.preventDefault()
      return moveCursor(ctx, clampToGrid(ctx.rows, ctx.cols, r + 1, c), { extend, additive })
    case 'ArrowLeft':
      e.preventDefault()
      return moveCursor(ctx, clampToGrid(ctx.rows, ctx.cols, r, c - 1), { extend, additive })
    case 'ArrowRight':
    case 'Tab':
      e.preventDefault()
      return moveCursor(ctx, clampToGrid(ctx.rows, ctx.cols, r, c + 1), { extend, additive })
    case 'Enter':
      e.preventDefault()
      return ctx.startEdit(r, c)
    case 'Delete':
    case 'Backspace': {
      // 清空整个选区（不删除表格）；空选区（全部 Ctrl 取消）不动作
      e.preventDefault()
      e.stopPropagation()
      if (!ctx.selection.size) return
      return ctx.onClearCells?.(ctx.tableId, [...ctx.selection].map(keyToCoord))
    }
    case 'Escape':
      // 取消单元格选中；再次 Esc 由画布取消表格选中
      e.stopPropagation()
      ctx.setSelection(new Set())
      ctx.setAnchor(null)
      return ctx.setCursor(null)
    default:
      // 直接输入字符：以该字符开始编辑（Excel 行为）
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        ctx.startEdit(r, c, e.key)
      }
  }
}

/** Ctrl/⌘ + C / X 复制剪切；+ V 交给 paste 通道（见 useTableClipboard / useTablePaste） */
function handleClipboardCombo(ctx, e) {
  const combo = e.key.toLowerCase()
  if (combo === 'c' || combo === 'x') {
    e.preventDefault()
    e.stopPropagation()
    ctx.copySelection(combo === 'x')
    return true
  }
  if (combo === 'v') {
    // 不阻断默认行为：浏览器随后会在 window 上派发 paste 事件，
    // 那是唯一能同步拿到 clipboardData 的可靠通道（见 useTablePaste）。
    // 少数环境下 paste 事件不派发，这里用异步 API 兜底 —— 序号一变即说明已处理过
    ctx.handlePasteShortcut()
    return true
  }
  return false
}

/** 编辑中不接管；焦点不在表格内时只有「主选中表格」接管；焦点在输入控件时不接管 */
function shouldTakeOver(ctx, e) {
  if (ctx.editing) return false // 编辑中由输入框自行处理
  if (!ctx.cursor) return false // 无活动单元格：交给画布处理（Esc 取消选中 / Delete 删除表格）

  const target = e.target
  // 焦点在表格内时接管；焦点落在 body（点过画布后常见）时只有「主选中表格」接管，
  // 否则多选几张表时同一次按键会被每张表各处理一遍
  const inTable = ctx.wrapRef.current?.contains(target)
  if (!inTable && (target !== document.body || !ctx.primary)) return false
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  ) {
    return false
  }
  return true
}

/**
 * 表格 keydown 总入口（window 捕获阶段调用）
 * @param {KeyboardEvent} e 原生键盘事件
 * @param {object} ctx      单元格状态与回调（由 useTableKeyboard 每次订阅时组装）
 */
export function handleTableKeydown(e, ctx) {
  if (!shouldTakeOver(ctx, e)) return

  // Ctrl/⌘ + C / X / V：剪贴板。放在移动/输入分支之前，
  // 否则带修饰键的字母会被当成输入字符吞掉（这正是之前复制不生效的原因）。
  if ((e.ctrlKey || e.metaKey) && !e.altKey && handleClipboardCombo(ctx, e)) return

  handleMoveKey(ctx, e)
}
