/* ============================================================
   表格剪贴板交互 —— 复制 / 剪切 / 粘贴 + 反馈动效
   ------------------------------------------------------------
   两条粘贴通道，靠「时间戳 + 事件序号」去重：
   · paste 事件：能同步拿到 clipboardData，是主通道
   · Ctrl+V 的 keydown 兜底：少数环境下 paste 事件不派发，改用异步 API
   反馈形态（见 constants.js 的 FLASH_KIND）：
   · 复制 / 剪切：选区四周一圈流动虚线「蚂蚁线」，常驻不自动消失，
     直到粘贴（被文字提示替换）/ 进入单元格编辑 / 表格取消选中
   · 粘贴：选区右下角内侧的文本轻提示，1.2 秒后消失
   ============================================================ */

import { useEffect, useRef, useState } from 'react'
import { CLIP_COL_SEP, CLIP_ROW_SEP, parseClipText, writeClipText } from './tableClipboard'
import { keyToCoord, rectKeys, selectionBox } from './tableGeometry'
import { FLASH_DURATION_MS, FLASH_KIND } from './constants'

export function useTableClipboard({
  table,
  cells,
  selection,
  cursor,
  anchor,
  onClearCells,
  onPasteCells,
  onSelectionChange,
  wrapRef,
}) {
  const pasteStampRef = useRef(0) // 粘贴事件序号：给 keydown 的异步兜底去重
  const lastPasteAtRef = useRef(0) // 上次真正落地粘贴的时间，防止双通道重复粘贴
  const flashTimerRef = useRef(null)

  const [flash, setFlash] = useState(null) // { kind, text?, r1, r2, c1, c2 } 复制动效 / 粘贴轻提示

  // 粘贴成功提示（几行几列）—— 1.2 秒后自动消失
  const showFlash = (text, box) => {
    setFlash({ kind: FLASH_KIND.PASTE, text, ...box })
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => {
      flashTimerRef.current = null
      setFlash(null)
    }, FLASH_DURATION_MS)
  }

  // 复制 / 剪切成功：在选区四周亮起流动虚线框。
  // 不自动消失 —— 一直亮到粘贴（被文字提示替换）/ 进入单元格编辑 /
  // 表格取消选中（clearFlash，由 CanvasTable 在上述时机调用）。
  // 顺带清掉可能挂着的粘贴提示定时器，防止它误把常驻的虚线框清掉。
  const showCopyBox = (kind, box) => {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current)
      flashTimerRef.current = null
    }
    setFlash({ kind, ...box })
  }

  useEffect(
    () => () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    },
    [],
  )

  // 把选区按 TSV 写进系统剪贴板；cut=true 时写完后清空单元格
  const copySelection = async (cut) => {
    const box = selectionBox(selection)
    if (!box) return

    const lines = []
    for (let r = box.r1; r <= box.r2; r += 1) {
      const row = []
      for (let c = box.c1; c <= box.c2; c += 1) row.push(cells[r]?.[c] ?? '')
      lines.push(row.join(CLIP_COL_SEP))
    }

    const ok = await writeClipText(lines.join(CLIP_ROW_SEP))
    // 降级方案会临时把焦点挪到 textarea 上，这里还给表格，
    // 否则接下来的方向键 / 粘贴会落到别的地方
    wrapRef.current?.focus({ preventScroll: true })
    if (!ok) return

    showCopyBox(cut ? FLASH_KIND.CUT : FLASH_KIND.COPY, box)
    if (cut) onClearCells?.(table.id, [...selection].map(keyToCoord))
  }

  /**
   * 把剪贴板文本贴到当前选区；超出表格时由父级自动扩行扩列。
   * - 单选：从活动格向右下铺开，选区随后包住整块内容，光标停在内容最后一格
   * - 多选（框选一片单元格）：以选区左上角为起点，把内容循环铺满整块选区，
   *   光标与选区最后落在选区右下角那一格 —— Excel 里「粘贴到多选区域」的语义
   */
  const applyPaste = (text) => {
    // 去重：paste 事件与 keydown 的异步兜底是同一次按键的两条通道，
    // 极端时序下可能都跑到这里，短时间内只认第一条
    const now = performance.now()
    if (now - lastPasteAtRef.current < 250) return
    lastPasteAtRef.current = now

    const block = parseClipText(text)
    if (!block.length) return
    const origin = cursor ?? anchor
    if (!origin) return

    const srcH = block.length
    const srcW = Math.max(...block.map((row) => row.length))
    if (!srcW) return

    const box = selectionBox(selection)
    const multi = !!box && (box.r2 > box.r1 || box.c2 > box.c1)

    // 落点与铺开尺寸：多选时铺满框选区域（内容比选区大则以内容为准，不截断）
    const r1 = multi ? box.r1 : origin.r
    const c1 = multi ? box.c1 : origin.c
    const h = multi ? Math.max(box.r2 - box.r1 + 1, srcH) : srcH
    const w = multi ? Math.max(box.c2 - box.c1 + 1, srcW) : srcW

    // 按目标尺寸铺块：内容不够就循环填充（复制 1 格贴满整块选区就是最常见的用法）
    const filled = Array.from({ length: h }, (_, dr) =>
      Array.from({ length: w }, (_, dc) => {
        const srcRow = block[dr % srcH]
        return srcRow?.[dc % srcW] ?? ''
      }),
    )

    onPasteCells?.(table.id, r1, c1, filled)

    // 粘贴后选区覆盖整块落地区域，光标停在最后一格，方便继续拖拽 / 清空 / 接着敲
    const r2 = r1 + h - 1
    const c2 = c1 + w - 1
    const next = new Set()
    rectKeys(r1, c1, r2, c2).forEach((k) => next.add(k))
    // 选区由调用方（组件）持有，这里通过回调把结果交回去
    onSelectionChange?.({ anchor: { r: r1, c: c1 }, selection: next, cursor: { r: r2, c: c2 } })
    showFlash(multi ? `已填充 ${h}×${w}` : `已粘贴 ${h}×${w}`, { r1, r2, c1, c2 })
  }

  /** paste 事件通道：先给事件序号打点，抑制 keydown 的异步兜底 */
  const applyPastedText = (text) => {
    pasteStampRef.current += 1
    applyPaste(text)
  }

  /**
   * Ctrl / ⌘ + V 的 keydown 通道：
   * 不阻断默认行为 —— 浏览器随后会在 window 上派发 paste 事件，
   * 那是唯一能同步拿到 clipboardData 的可靠通道（见 useTablePaste）。
   * 这里只是给「paste 事件没派发」的环境留一条 160ms 后的异步兜底。
   */
  const handlePasteShortcut = () => {
    const stamp = pasteStampRef.current
    window.setTimeout(() => {
      if (pasteStampRef.current !== stamp) return
      navigator.clipboard
        ?.readText?.()
        .then((text) => {
          if (pasteStampRef.current !== stamp || !text) return
          pasteStampRef.current += 1
          applyPaste(text)
        })
        .catch(() => {})
    }, 160)
  }

  const clearFlash = () => setFlash(null)

  return { flash, copySelection, applyPastedText, handlePasteShortcut, clearFlash }
}
