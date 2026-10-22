/* 剪贴板反馈形态（CanvasTable 内部约定）
   复制 / 剪切 → 选区四周的流动虚线「蚂蚁线」；
   粘贴 → 选区右下角的文本轻提示。 */

export const FLASH_KIND = {
  COPY: 'copy',
  CUT: 'cut',
  PASTE: 'paste',
}

/** 粘贴文本轻提示的展示时长（毫秒）；复制/剪切的蚂蚁线常驻，不走定时器 */
export const FLASH_DURATION_MS = 1200
