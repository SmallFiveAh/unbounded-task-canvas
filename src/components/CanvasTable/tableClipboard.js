/* ============================================================
   表格剪贴板 —— 纯文本 ↔ 二维数组，以及写系统剪贴板
   ------------------------------------------------------------
   用 TSV（Tab 分列、换行分行）与 Excel / 飞书表格互通。
   这里只做格式转换与写入，不关心「贴到哪个单元格」。
   ============================================================ */

/** 剪贴板二维文本分隔符：列用 Tab、行用换行 —— 与 Excel / 各家在线表格一致 */
export const CLIP_COL_SEP = '\t'
export const CLIP_ROW_SEP = '\n'

/**
 * 剪贴板纯文本 → 二维数组。
 * 兼容 CRLF；末尾的空行是 Excel 系列软件的惯用收尾，丢掉即可。
 */
export function parseClipText(text) {
  const body = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '')
  if (!body) return []
  return body.split('\n').map((line) => line.split('\t'))
}

/**
 * 写剪贴板：优先异步 Clipboard API（需要安全上下文 / 用户授权），
 * 失败时退回临时 textarea + execCommand —— 保留 http 调试场景可用。
 * 降级方案会短暂抢焦点，调用方负责把焦点还给表格。
 */
export async function writeClipText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 授权被拒 / 非安全上下文：走下面的降级路径
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
