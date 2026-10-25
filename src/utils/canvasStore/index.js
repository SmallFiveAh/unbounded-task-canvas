/* ============================================================
   统一出口：外部一律 `import { xxx } from 'utils/canvasStore'`
   ============================================================ */

export { MIN_SCALE, MAX_SCALE, EMPTY_CANVAS } from './constants'
export { createSeedCanvas, readCanvas, loadCanvas, writeCanvas, subscribeCanvas, createSaver } from './doc'
