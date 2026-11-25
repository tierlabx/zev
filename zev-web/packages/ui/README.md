# @zev/ui

本包是 Zev 项目的前端公共组件库，主要用于在所有前端子应用（如 `apps/admin` 等）之间共享 UI 组件。

## 🎨 技术选型与内置能力

- **基础组件库**：[shadcn/ui](https://ui.shadcn.com/)（基于 Radix UI + Tailwind CSS v4）。
- **动画原语、图标与背景**：`animate-ui`（`@animate-ui/react` + `motion/react`）
  - `src/components/animate-ui/icons/`：已集成 34 个 Lucide 动画图标，配合 `<AnimateIcon animateOnHover>` 实现悬停微动效。
  - `src/components/animate-ui/backgrounds/`：集成 `StarsBackground` 与 `GravityStarsBackground` 交互粒子背景（供 404 等非高频数据页使用）。
- **数据可视化与遥测组件**（兼容 Recharts v3）：
  - `chart.tsx`：`ChartContainer`、`ChartTooltipContent`、`ChartLegendContent`，自动适配明暗主题 Token。
  - `tracker.tsx`：Tremor 风格服务心跳状态条（支持 `operational` / `degraded` / `down` / `idle` 与 Tooltip）。
  - `bar-list.tsx`：横向比例分布条。
  - `delta-badge.tsx`：KPI 环比涨跌徽章。

## 📦 如何使用

在子应用中通过包名 `@zev/ui/components/...` 引入组件：

```tsx
import { AnimateIcon } from "@animate-ui/react/icons";
import { Plus } from "@zev/ui/components/animate-ui/icons/plus";
import { Button } from "@zev/ui/components/button";
import { Tracker } from "@zev/ui/components/tracker";

export function Example() {
  return (
    <div className="space-y-4">
      <AnimateIcon animateOnHover asChild>
        <Button>
          <Plus className="h-4 w-4" />
          新增
        </Button>
      </AnimateIcon>
      <Tracker data={[{ key: "1", status: "operational", tooltip: "10:00 · 正常" }]} />
    </div>
  );
}
```

## 🧪 Storybook 独立预览

在 `zev-web` 根目录运行 `pnpm storybook` 即可独立查看组件矩阵、Animate UI 图标画廊、Chart 明暗主题及 `ZevTable` 各种边界状态。新增公共组件时建议同步补充同级 `*.stories.tsx`。

## ⚠️ 维护注意事项

1. **禁止 `forceMount`**：基于 `@animate-ui/react/primitives/radix-ui/*` 的弹出层（如 `DropdownMenuContent`、`PopoverContent`）切勿传入 `forceMount`，避免关闭态透明容器拦截页面点击；`DropdownMenuContent` 已默认配置 `data-[state=closed]:pointer-events-none`。
2. **避免双层 `asChild`**：若按钮外层已是 Radix `Trigger asChild`，请将 `<AnimateIcon animateOnHover>` 放入按钮内部包裹图标。
3. **禁止用 CLI 覆盖 `chart`**：不要直接运行 `shadcn add chart`（该命令会尝试将 Recharts 降级至 v2 并覆盖 `card.tsx`），请直接维护当前兼容 Recharts v3 的 `src/components/chart.tsx`。
4. **Registry 文件检查**：从 `@animate-ui` registry 新添加组件后，需确保 `cn` 导入指向 `@zev/ui/lib/utils`，并清理未使用的 `import * as React`。
