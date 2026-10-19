# 工程化工具链配置

## 必备工具

```
ESLint + Prettier          → 代码质量 & 格式化
Husky + lint-staged        → Git 提交前自动检查
TypeScript                 → 类型安全
Vitest / Jest + RTL        → 单元测试
Playwright / Cypress       → E2E 测试
Storybook                  → 组件文档 & 视觉测试
```

## package.json 脚本配置

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint src --ext .ts,.tsx --max-warnings 0",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,scss,json}\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{css,scss}": ["stylelint --fix", "prettier --write"]
  }
}
```

## Husky pre-commit 钩子

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
npm run type-check
```

## tsconfig 绝对路径导入

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

Vite 项目需同步配置 `vite.config.ts` 的 `resolve.alias`。
