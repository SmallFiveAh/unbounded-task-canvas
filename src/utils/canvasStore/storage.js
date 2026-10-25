/* ============================================================
   存储介质：localStorage 优先，不可用时退化为内存 Map
   ------------------------------------------------------------
   · localStorage 不可用（隐私模式 / 配额满）时退化为内存存储，功能不中断
   · readCanvas / writeCanvas 只依赖这里的 storage / memoryFallback
   ============================================================ */

export const memoryFallback = new Map()

export const storage = (() => {
  try {
    const probe = '__utc_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
})()
