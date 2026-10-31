<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/images/logo-mark-dark.svg">
  <img src="public/images/logo-mark.svg" width="104" height="104" alt="无限任务画布 Logo">
</picture>

# 无限任务画布 · Unbounded Task Canvas

**把任务摊开在一张无限大的画布上 —— 节点、连线、Excel 风格表格，随想随画，本地即存。**

[演示](#-演示) · [功能特性](#-功能特性) · [快速开始](#-快速开始) · [交互与快捷键](#-交互与快捷键) · [配置说明](#-配置说明) · [参与贡献](#-参与贡献)

<img alt="React 19" src="https://img.shields.io/badge/React-19-61dafb?logo=react&amp;logoColor=white"> <img alt="Vite 8" src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&amp;logoColor=white"> <img alt="License MIT" src="https://img.shields.io/badge/License-MIT-green"> <img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-ff4d00">

</div>

---

## 🎬 演示

▶ **[点击播放 3 分钟演示视频](https://github.com/SmallFiveAh/unbounded-task-canvas/raw/main/public/out/unbounded-canvas-mg-compressed.mp4)**

## ✨ 功能特性

> 设计理念：**极致极简**。暖纸面 + 暖墨色 + 一抹信号橙，明暗双主题均为主动设计；所有数据只存在你自己的浏览器里，没有账号、没有上传。

### 🎨 无限画布

- **自由视口**：拖拽空白处或滚轮平移，`Ctrl/⌘ + 滚轮` 以光标为中心缩放（20% – 500%），右下角徽标一键回到 100%
- **双层点阵网格**：细网格 + 主网格随缩放联动，高倍率自动细分、低倍率自动隐藏，拒绝摩尔纹
- **节点**：双击空白处即建，拖拽移动、双击编辑文案、四角控制点缩放（1px 定宽选中框，缩放不变形）
- **框选与多选**：选择工具下拖出选框，批量框选节点与表格，整体拖拽

### 📊 Excel 风格画布表格

- **行号 + 列标**（A / B / C…）的网格单元格，通过 Word 式网格面板插入（最大 10 × 10）
- **完整键盘操作**：方向键 / `Tab` 移动光标，`Shift + 方向键` 扩展矩形选区，`Ctrl/⌘ + 单击` 增减选区，直接输入字符即开始编辑（原汁原味的 Excel 手感）
- **剪贴板互通**：`Ctrl/⌘ + C / X / V` 以 TSV 格式复制粘贴，**可与 Excel、飞书表格直接互拷**；粘贴区域放不下时自动扩行扩列
- **智能缩放**：拖动四角改变的是列宽行高，而不是把文字拉扁

### 🗂️ 任务列表

- 搜索 + 分类筛选（全部 / 工作 / 个人 / 项目）
- 每张任务卡片渲染对应画布的**结构缩略图**（SVG 实时绘制，不含文本内容，保护数据隐私）
- 点击卡片在新标签页打开 `/canvas/:taskId` 全屏画布

### 💾 本地持久化

- 画布内容（节点 / 连线 / 表格）**与视图**（缩放 + 平移）按任务维度存入 `localStorage`，下次打开原样回到上次的视角
- 节流写入（120ms）+ 关闭页面前强制落盘；`localStorage` 不可用时自动退化为内存存储
- 跨标签页实时同步：画布里改动，任务列表缩略图立刻跟上

## 🖱️ 交互与快捷键

| 操作  | 画布                        | 表格                                     |
| --- | ------------------------- | -------------------------------------- |
| 新建  | 双击空白处添加节点                 | 左侧工具栏「插入表格」                            |
| 移动  | 拖拽空白处 / 滚轮 / `Space` + 拖拽 | 按住表头或空白区拖拽                             |
| 缩放  | `Ctrl/⌘ + 滚轮`（光标为中心）      | 拖动四角控制点 = 调整行高列宽                       |
| 选择  | 单击选中，拖拽框选多选               | 单击 / `Ctrl+单击` / `Shift+单击` / 拖拽框选     |
| 编辑  | 双击节点编辑文字                  | 双击或直接输入字符                              |
| 删除  | `Delete` 删除选中元素           | `Delete` / `Backspace` 清空选区内容          |
| 取消  | `Esc` 取消选中                | `Esc` 取消单元格选区（再按取消表格选中）                |
| 剪贴板 | —                         | `Ctrl/⌘ + C` 复制 · `X` 剪切 · `V` 粘贴（TSV） |

## 🚀 快速开始

```bash
# 环境要求：Node.js ≥ 20.19（或 ≥ 22.12）

# 1. 克隆仓库
git clone https://github.com/<your-name>/unbounded-task-canvas.git
cd unbounded-task-canvas

# 2. 安装依赖
npm install

# 3. 启动开发服务器（默认 http://localhost:5173）
npm run dev
```

其他命令：

```bash
npm run build     # 生产构建，输出到 dist/
npm run preview   # 本地预览生产构建
npm run lint      # ESLint 检查
```

## 📖 使用示例

1. 启动后进入**任务列表**页，任选一张任务卡片（如「产品需求分析」）
2. 在新标签页打开全屏画布，双击空白处新建节点，拖动四角调整大小
3. 点击左侧工具栏 📋 插入一张 4 × 4 的表格，在 Excel 里复制一片数据，`Ctrl + V` 直接贴进来
4. 滚轮 + `Ctrl` 缩放画面，拖动空白处平移 —— 关掉页面再打开，一切原样保留
5. 回到任务列表，卡片的缩略图已经悄悄变成了你刚画的样子

> 也可以直接访问 `http://localhost:5173/canvas/1` 打开指定任务的画布。

## ⚙️ 配置说明

项目当前**零配置、开箱即用**。所有可调参数以常量形式集中在源码中：

| 想改什么          | 位置                                  | 默认值                             |
| ------------- | ----------------------------------- | ------------------------------- |
| 缩放范围          | `src/utils/canvasStore.js`          | 20% – 500%                      |
| 网格间距（细 / 主）   | `src/pages/canvas/lib/constants.js` | 24 / 120                        |
| 节点默认尺寸 / 最小尺寸 | `src/pages/canvas/lib/constants.js` | 176×76 / 96×48                  |
| 表格单元格尺寸范围     | `src/constants/canvasTable.js`      | 宽 48–320，高 20–120               |
| 种子任务数据        | `src/constants/tasks.js`            | 6 条示例任务                         |
| 主题与设计令牌 | `src/styles/tokens.css` | 暖纸白 / 暖墨 / 信号橙 |
| 本地存储键名        | `src/utils/canvasStore.js`          | `unbounded-canvas:doc:<taskId>` |

明暗主题跟随系统 `prefers-color-scheme`，无需手动切换。

## 📁 目录结构

```text
src/
├── assets/                   # 参与构建的图片资源（import 后交给 Vite 处理）
├── components/               # 通用组件（一个组件一个目录：jsx + module.css + index.js）
│   ├── CanvasTable/          #   Excel 风格画布表格（选区 / 键盘 / 剪贴板各自独立 hook）
│   ├── CanvasThumbnail/      #   任务卡片的画布结构缩略图（SVG）
│   ├── InsertTablePanel/     #   Word 式表格插入面板
│   ├── SelectionFrame/       #   选中框与四角控制点
│   └── Sidebar/              #   左侧全局导航
├── constants/                # 共享常量（导航、任务种子数据、表格尺寸）
├── hooks/                    # 跨页面复用的 hook（如画布快照订阅）
├── pages/
│   ├── canvas/
│   │   ├── components/       #   画布展示层：工具栏 / 节点层 / 选中层 / 缩放徽标 / 保存提示
│   │   ├── hooks/            #   画布行为层：视口 / 文档 / 选中 / 拖拽 / 缩放 / 键盘 / 持久化
│   │   └── lib/              #   纯函数与常量（不依赖 React）
│   ├── CanvasPage.jsx        #   无限画布页（编排层，只做组装）
│   └── TasksListPage.jsx     #   任务列表页
├── styles/                   # 设计令牌（tokens.css）与全局基础样式
└── utils/                    # canvasStore：localStorage 读写 / 节流保存 / 跨标签页广播

public/
├── favicon.svg               # 标签页图标（与 logo 同源）
├── icons.svg                 # 公共图标
├── images/                   # 原样发布的静态图片（README / 分享图 / logo）
│   ├── logo.svg · logo-dark.svg
│   └── logo-mark.svg · logo-mark-dark.svg
└── out/                      # README 演示视频
    └── unbounded-canvas-mg-compressed.mp4  # 压缩版（6 MB，演示链接使用这个）
```

目录约定：**图片按用途分流**——参与构建、需要被 `import` 的资源放 `src/assets/`；README、分享图等原样发布的静态图片放 `public/images/`。全局样式统一放 `src/styles/`，组件样式仍用 CSS Modules 就近维护。

## 🗺️ Roadmap

- [ ] 便签 / 思维导图 / 流程图 / 卡片 / 列表卡片（工具栏入口已就位）
- [ ] 仪表盘、日历、数据分析页（已预留 ECharts 依赖）
- [ ] 新建任务流程与任务编辑
- [ ] 云端同步与多人协作
- [ ] 节点间连线的可视化编辑

## 🤝 参与贡献

欢迎各种形式的贡献！

1. Fork 本仓库并创建特性分支：`git checkout -b feat/your-feature`
2. 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)，如 `feat: xxx` / `fix: xxx`
3. 提交前请确保 `npm run lint` 通过
4. 发起 Pull Request，并描述改动动机与效果

提交代码前建议先读一遍 `src/pages/CanvasPage.jsx` 顶部的架构注释 —— 它是整个画布的「地图」。

## 📄 许可证

本项目基于 [MIT](LICENSE) 许可证开源。

---

<div align="center">

如果这个项目对你有帮助，欢迎点一个 ⭐ 支持一下！

</div>
