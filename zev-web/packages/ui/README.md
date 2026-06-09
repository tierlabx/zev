# @zev/ui

本包是 Zev 项目的前端公共组件库，主要用于在所有前端子应用（如 `apps/admin` 等）之间共享 UI 组件。

## 🎨 技术选型

组件库的基础架构和样式基于以下规范：

- **基础组件库**: [shadcn/ui](https://ui.shadcn.com/)
  - 我们使用 shadcn/ui 的无头（Headless）组件和 Tailwind CSS 来构建所有基础组件（如 Button, Input, Card 等）。
  - 这些组件是完全可定制的，并且源码直接在本项目内维护。

- **动画组件库**: **animate-ui**
  - 在 shadcn/ui 的基础上，我们引入了基于其构建的 `animate-ui`。
  - 主要用于实现高交互性、精美的微动效和复杂的页面动画，提升整个系统的用户体验。

- **样式引擎**:
  - [Tailwind CSS v4](https://tailwindcss.com/)
  - [tailwind-merge](https://github.com/dcastil/tailwind-merge) & [clsx](https://github.com/lukeed/clsx) 用于动态类名合并。

## 📦 如何使用

在子应用中，你可以直接通过包名 `@zev/ui/components/...` 引入你需要的组件。

示例：
```tsx
import { Button } from "@zev/ui/components/button";
import { Input } from "@zev/ui/components/input";

export default function MyPage() {
  return (
    <div className="p-4">
      <Input placeholder="请输入内容..." />
      <Button className="mt-2">提交</Button>
    </div>
  );
}
```

## 🛠️ 添加新组件

如果需要添加新的 shadcn/ui 组件，建议直接将组件代码提取并放置在 `src/components/` 目录下，并确保其相关的依赖已经添加到 `packages/ui/package.json` 中。


https://animata.design/docs/overlay/modal