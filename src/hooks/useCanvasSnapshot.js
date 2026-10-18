import { useEffect, useState } from 'react'
import { loadCanvas, subscribeCanvas } from '../utils/canvasStore'

/**
 * 订阅某个任务的画布快照（只读）。
 * · 挂载时从 localStorage 读取
 * · 画布页写入后（同标签页事件 / 跨标签页 storage 事件）实时刷新
 * · 窗口重新获得焦点、页面重新可见时兜底重读，避免休眠期间漏掉事件
 */
export function useCanvasSnapshot(task) {
  const [doc, setDoc] = useState(() => loadCanvas(task))

  useEffect(() => {
    const sync = () => {
      const next = loadCanvas(task)
      // updatedAt 相同说明数据没变，避免无意义的重渲染
      setDoc((prev) => (prev.updatedAt === next.updatedAt ? prev : next))
    }

    sync()

    const unsubscribe = subscribeCanvas(task.id, sync)
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }

    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      unsubscribe()
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [task])

  return doc
}
