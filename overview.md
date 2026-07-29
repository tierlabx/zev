# Zev UI Design System v2 — Overview

## What was done

为 Zev 开源后台管理系统创建了全新的 UI 设计方案，涵盖品牌色彩、排版、动效体系、组件规范和实现路线图。

## Key decisions

1. **色彩**：从 Logo 狼头提取 Slate 银灰色阶 + Steel Blue 动作色 + Amber 点缀色，替换原 Ant Design #1677FF
2. **动画优先**：四层动效编排（微交互 / 内容过渡 / 布局动画 / 环境效果），全量使用 Framer Motion
3. **Dashboard**：从空白占位升级为统计卡片 + 趋势图 + 活动流 + 系统健康
4. **暗色模式**：完整的 token 映射 + 300ms 平滑过渡
5. **无障碍**：WCAG AA 对比度、键盘导航、prefers-reduced-motion 支持

## Deliverables

- `docs/ui-design-proposal.md` — 完整设计规范（11 章节，含 CSS 变量、Framer Motion 变体库、实现路线图）
- 3 个可视化原型（inline SVG）：设计令牌总览、仪表盘界面原型、动画编排体系

## Next steps

- Phase 1: 设计令牌迁移（替换硬编码颜色为 CSS 变量）
- Phase 2: Dashboard 页面构建（AnimatedCounter / Sparkline / TrendChart 组件）
- Phase 3: 组件动画增强（Sidebar layoutId / Table FLIP / Dialog shake）
- Phase 4: 暗色模式实现
- Phase 5: 响应式适配 & 无障碍审计
