# Zev UI Design System v2

> 狼之设计语言 — 果敢、沉稳、动画优先

---

## 1. Design Philosophy

Zev（希伯来语"狼"）的品牌内核是**果敢沉稳、靠谱有担当**。界面设计延续这一精神：

| Principle | Description |
|-----------|-------------|
| **Animation-first** | 动画不是装饰，而是引导注意力、提供空间连续性的核心手段。每个交互都有动效反馈。 |
| **Wolf steel aesthetic** | 以几何狼头 Logo 的银灰色调（Slate）为视觉基底，配合 Steel Blue 动作色和 Amber 点缀色。 |
| **Calm density** | 后台管理系统需要信息密度，但通过留白节奏、层级分明的阴影和克制的色彩保持视觉冷静。 |
| **Accessibility built-in** | WCAG AA 为底线：4.5:1 文字对比度、44px 触摸目标、键盘导航、`prefers-reduced-motion` 支持。 |

---

## 2. Color System

### 2.1 Brand Palette — Wolf Steel (Slate)

从 Logo 渐变中提取的 9 级灰蓝色阶，作为页面结构色（文字、背景、边框、侧边栏）。

| Token | Hex | Usage |
|-------|-----|-------|
| `--slate-50` | `#F8FAFC` | Page background |
| `--slate-100` | `#F1F5F9` | Subtle surface, hover bg |
| `--slate-200` | `#E2E8F0` | Borders, dividers |
| `--slate-300` | `#CBD5E1` | Disabled borders |
| `--slate-400` | `#94A3B8` | Placeholder text, muted icons |
| `--slate-500` | `#64748B` | Secondary text, captions |
| `--slate-600` | `#475569` | Body text emphasis |
| `--slate-700` | `#334155` | Sidebar items, labels |
| `--slate-800` | `#1E293B` | Headings, logo bg |
| `--slate-900` | `#0F172A` | Primary text, dark surfaces |

### 2.2 Action Color — Steel Blue

替换原有的 Ant Design `#1677FF`，选用更冷、更有"钢铁感"的蓝色：

| Token | Hex | Usage |
|-------|-----|-------|
| `--blue-400` | `#60A5FA` | Light accent, hover |
| `--blue-500` | `#3B82F6` | Primary buttons, links |
| `--blue-600` | `#2563EB` | Active states, focus rings |
| `--blue-50` | `#EFF6FF` | Selected row bg, light fills |

### 2.3 Accent — Wolf Eye Amber

从 Logo 中狼眼的"银光"概念延伸，用琥珀色作为高亮提醒色（通知、警告、活跃标记）：

| Token | Hex | Usage |
|-------|-----|-------|
| `--amber-400` | `#FBBF24` | Light accent |
| `--amber-500` | `#F59E0B` | Warning, notification dot |
| `--amber-50` | `#FEF3C7` | Light fill |

### 2.4 Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--success` | `#10B981` | Success toast, online status |
| `--success-bg` | `#ECFDF5` | Light success fill |
| `--error` | `#EF4444` | Error, destructive actions |
| `--error-bg` | `#FEE2E2` | Light error fill |
| `--info` | `#06B6D4` | Info badges |
| `--info-bg` | `#ECFEFF` | Light info fill |

### 2.5 CSS Variable Implementation

```css
:root {
  /* Wolf steel */
  --color-bg-page: #F8FAFC;
  --color-bg-surface: #FFFFFF;
  --color-bg-subtle: #F1F5F9;
  --color-border: #E2E8F0;
  --color-border-hover: #CBD5E1;
  --color-text-primary: #0F172A;
  --color-text-secondary: #475569;
  --color-text-muted: #64748B;
  --color-text-placeholder: #94A3B8;

  /* Action */
  --color-primary: #2563EB;
  --color-primary-hover: #3B82F6;
  --color-primary-light: #EFF6FF;

  /* Accent */
  --color-accent: #F59E0B;
  --color-accent-light: #FEF3C7;

  /* Semantic */
  --color-success: #10B981;
  --color-success-light: #ECFDF5;
  --color-error: #EF4444;
  --color-error-light: #FEE2E2;
  --color-info: #06B6D4;
  --color-info-light: #ECFEFF;
}

[data-theme="dark"] {
  --color-bg-page: #0F172A;
  --color-bg-surface: #1E293B;
  --color-bg-subtle: #334155;
  --color-border: #334155;
  --color-border-hover: #475569;
  --color-text-primary: #F1F5F9;
  --color-text-secondary: #CBD5E1;
  --color-text-muted: #94A3B8;
  --color-text-placeholder: #64748B;
  --color-primary: #3B82F6;
  --color-primary-hover: #60A5FA;
  --color-primary-light: rgba(59, 130, 246, 0.15);
}
```

---

## 3. Typography System

字体栈优先使用系统字体，保证加载速度和原生感：

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
}
```

### Type Scale (8-point rhythm)

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `text-2xl` | 24px | 500 | 1.3 | Page title (Dashboard) |
| `text-xl` | 18px | 500 | 1.35 | Section heading |
| `text-lg` | 15px | 500 | 1.4 | Card title, dialog title |
| `text-base` | 14px | 400 | 1.6 | Body text, table cells |
| `text-sm` | 12px | 400 | 1.5 | Captions, secondary text |
| `text-xs` | 11px | 400 | 1.4 | Tags, timestamps, badges |

**Rule**: Only two weights — 400 (regular) and 500 (medium). Never use 600/700; it creates visual noise in data-dense interfaces.

---

## 4. Spacing & Layout

### 4.1 Spacing Scale (4px base, 8-point rhythm)

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Icon gaps, tight padding |
| `space-2` | 8px | Component internal gaps |
| `space-3` | 12px | Input padding, card gaps |
| `space-4` | 16px | Default padding, card padding |
| `space-6` | 24px | Section gaps, sidebar padding |
| `space-8` | 32px | Page section spacing |
| `space-12` | 48px | Major section breaks |

### 4.2 Layout Architecture

```
+--------------------------------------------------+
| Sidebar (240px / 64px collapsed)                 |
| +----------------------------------------------+ |
| | Logo (56px height)                           | |
| | Navigation (flex-1, scrollable)             | |
| | Collapse toggle (48px height)               | |
| +----------------------------------------------+ |
+--------------------------------------------------+
| Header (56px height)                             |
| [Menu] [Breadcrumb]          [Search] [Actions]  |
+--------------------------------------------------+
| Tags View (34px height)                          |
| [Tab] [Tab] [Active Tab]              [<] [>]   |
+--------------------------------------------------+
| Main Content (flex-1, overflow-auto)             |
|                                                  |
|   Page content with 16px padding                 |
|   Route transition animation wrapper             |
|                                                  |
+--------------------------------------------------+
```

### 4.3 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 6px | Tags, small badges |
| `radius-md` | 8px | Buttons, inputs |
| `radius-lg` | 10px | Cards, dialogs |
| `radius-xl` | 14px | Large containers, modals |
| `radius-full` | 9999px | Avatars, pills, icon buttons |

---

## 5. Animation System (Animation-First)

> 这是 Zev 区别于普通后台管理系统的核心差异化要素。

### 5.1 Motion Tokens

```css
:root {
  /* Duration */
  --duration-snap: 150ms;
  --duration-swift: 300ms;
  --duration-deliberate: 500ms;

  /* Easing curves */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);    /* Primary — deceleration */
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);   /* Symmetric */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Overshoot */

  /* Framer Motion spring presets */
  --spring-snappy: { stiffness: 400, damping: 30 };
  --spring-smooth: { stiffness: 260, damping: 26 };
  --spring-gentle: { stiffness: 120, damping: 20 };
}
```

### 5.2 Four-Layer Animation Choreography

#### Layer 1 — Micro Interactions (50-150ms)

针对单个组件的即时反馈，让用户感受到"界面在回应我"。

| Element | Trigger | Animation | Duration |
|---------|---------|-----------|----------|
| Button | hover | `y: -1px` + shadow expand | 150ms |
| Button | press | `scale: 0.96` | 100ms |
| Input | focus | Ring expand from center (`box-shadow 0 0 0 3px`) | 200ms |
| Icon button (bell) | hover | `rotate: [0, -15, 15, -15, 0]` shake | 500ms |
| Dropdown menu | open | `scale: [0.95, 1]` + `opacity: [0, 1]` origin top | 200ms |
| Tooltip | hover | `opacity: [0, 1]` + `y: [4, 0]` | 150ms |
| Checkbox | check | `scale: [1, 0.8, 1.1, 1]` checkmark draw | 300ms |
| Toggle switch | toggle | `x` spring slide + bg color crossfade | spring |

```tsx
// Button hover animation pattern
<motion.button
  whileHover={{ y: -1, boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)" }}
  whileTap={{ scale: 0.96 }}
  transition={{ duration: 0.15, ease: "easeOut" }}
>
```

#### Layer 2 — Content Transitions (200-400ms)

页面级和内容级过渡，提供空间连续性。

| Scenario | Animation | Duration | Easing |
|----------|-----------|----------|--------|
| Route change (page swap) | `opacity: [0, 1]` + `y: [15, 0]` | 300ms | easeOut |
| Modal open | `scale: [0.95, 1]` + `opacity: [0, 1]` + backdrop blur-in | 300ms | easeOut |
| Modal close | `scale: [1, 0.95]` + `opacity: [1, 0]` | 200ms | easeIn |
| Drawer open | `x: ["100%", "0%"]` + backdrop fade | 350ms | easeOut |
| Tab switch | `layoutId` shared underline slide | 300ms | spring |
| Toast appear | `x: ["100%", "0%"]` + `opacity: [0, 1]` | 300ms | spring |
| Toast dismiss | `x: ["0%", "100%"]` + `opacity: [1, 0]` | 200ms | easeIn |
| Confirm dialog | `scale: [0.9, 1]` + `opacity: [0, 1]` | 250ms | easeSpring |

```tsx
// Route transition (already implemented in Main.tsx, enhanced version)
<motion.div
  key={pathname}
  initial={{ opacity: 0, y: 15 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -10 }}
  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
  className="h-full"
>
  <Outlet />
</motion.div>
```

#### Layer 3 — Layout Animations (300-500ms)

布局变化时的连续性动画，使用 Framer Motion 的 `layoutId` 和 `AnimatePresence`。

| Scenario | Animation | Technology |
|----------|-----------|------------|
| Sidebar collapse/expand | Width spring transition | `motion.aside` width animate |
| Nav item expand (children) | `height: auto` spring + children stagger | `AnimatePresence` + stagger |
| Active nav indicator | `layoutId` pill slide between items | Shared layout animation |
| Table row sort/reorder | FLIP animation | `layout` prop on rows |
| Card grid filter | Items `exit` shrink + fade, remaining `layout` reposition | `AnimatePresence` + `layout` |
| Tags view tab close | Tab width collapse + adjacent slide | `layout` + `exit` |
| Breadcrumb update | Items fade-in stagger | Stagger children |

```tsx
// Active nav indicator with shared layout animation
<motion.div
  layoutId="active-nav-pill"
  className="absolute inset-0 bg-blue-50 rounded-md"
  transition={{ type: "spring", stiffness: 400, damping: 30 }}
/>
```

#### Layer 4 — Ambient Effects (continuous)

持续运行的环境动效，营造"活着的"界面氛围。

| Effect | Location | Implementation |
|--------|----------|----------------|
| Three.js koi background | Login page | Already implemented (`ThreeKoiBackground`) |
| Logo breathing | Sidebar, login | SVG `<animate>` on background rings (already in logo) |
| Skeleton shimmer | Loading states | CSS `@keyframes` gradient sweep on gray bars |
| Stat counter | Dashboard cards | `useMotionValue` + `animate()` count-up on mount |
| Chart path draw | Dashboard charts | SVG `pathLength` animate from 0 to 1 |
| Notification pulse | Header bell dot | `scale: [1, 1.3, 1]` infinite loop, 2s |

```tsx
// Stat counter animation
function AnimatedCounter({ value }: { value: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  const display = useMotionTemplate`${rounded}`;

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [value]);

  return <motion.span>{display}</motion.span>;
}
```

### 5.3 Stagger Pattern

容器子元素以递增延迟入场，制造"逐层展开"的节奏感：

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,  // 50ms between each child
      delayChildren: 0.1,     // 100ms initial delay
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

// Usage
<motion.div variants={containerVariants} initial="hidden" animate="visible">
  {items.map((item) => (
    <motion.div key={item.id} variants={itemVariants}>
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

**Rule**: Stagger caps at 7 items (max 400ms total). Beyond that, use instant render to avoid awkward delays.

### 5.4 Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

```tsx
// Framer Motion: respect reduced motion
import { useReducedMotion } from "framer-motion";

function Component() {
  const shouldReduceMotion = useReducedMotion();
  const variants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
  // ...
}
```

---

## 6. Component Specifications

### 6.1 Sidebar (Redesigned)

**Current**: White bg, hardcoded `#1677FF`, static active state, no animation on expand/collapse.

**Redesigned**:

- Background: `--color-bg-surface` (white in light, `#1E293B` in dark)
- Width: 240px expanded / 64px collapsed, **spring transition** on toggle
- Active item: `layoutId` shared pill (`--color-primary-light` bg) that **slides** between nav items
- Hover: `--color-bg-subtle` background, 150ms
- Expand/collapse children: `AnimatePresence` with `height: auto` spring
- Collapsed state: icon-only with tooltip on hover
- Logo area: 56px height, wolf logo with subtle breathing animation
- Collapse toggle: bottom-pinned, 48px height

```tsx
// Active nav indicator slides between items
<AnimatePresence>
  {isActive && (
    <motion.div
      layoutId="sidebar-active"
      className="absolute inset-0 bg-blue-50 rounded-lg"
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    />
  )}
</AnimatePresence>
```

### 6.2 Header (Redesigned)

**Current**: 64px height, white bg, basic icon buttons.

**Redesigned**:

- Height: 56px (slightly reduced for more content space)
- Search bar: Pill-shaped, expands on focus (`width: 180px -> 280px` spring)
- Keyboard shortcut: `Ctrl+K` opens command palette (future feature)
- Action icons: 36px circular hover targets, `--color-bg-subtle` on hover
- Notification bell: Wiggle on hover (already implemented), pulse dot with infinite animation
- User avatar: 32px, dropdown with spring open animation
- Dark mode toggle: Sun/moon icon crossfade transition

### 6.3 Stat Cards (New — Dashboard)

Dashboard 的核心组件，替代当前空白占位页。

```tsx
<motion.div
  variants={itemVariants}
  whileHover={{ y: -2 }}
  transition={{ duration: 0.2 }}
  className="bg-white rounded-lg border border-slate-200 p-4"
>
  <div className="flex items-center justify-between mb-3">
    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
         style={{ background: iconBg }}>
      <Icon className="w-5 h-5" style={{ color: iconColor }} />
    </div>
    <TrendBadge value={trend} />
  </div>
  <p className="text-sm text-slate-500 mb-1">{label}</p>
  <AnimatedCounter value={value} className="text-2xl font-medium text-slate-900" />
  <Sparkline data={sparkData} color={sparkColor} className="mt-2 h-8" />
</motion.div>
```

**Animation sequence on dashboard mount**:
1. Welcome heading fades in (0.1s delay)
2. 4 stat cards stagger in (0.15s, 0.20s, 0.25s, 0.30s)
3. Chart card scales in (0.35s delay)
4. Activity feed items stagger (0.40s, 0.45s, 0.50s, 0.55s)
5. System health bars animate width from 0 to value (0.6s delay)

### 6.4 Data Table (Enhanced)

**Current**: `ZevTable` component with basic pagination.

**Redesigned additions**:

- Row hover: `--color-bg-subtle` slide-in from left (100ms)
- Row selection: Checkbox animate + row bg `--color-primary-light` (200ms)
- Sort: Column header arrow rotate + rows `layout` FLIP reposition (400ms spring)
- Pagination: Page button `layoutId` active pill slide
- Loading: Skeleton rows with shimmer animation (not spinners)
- Empty state: Centered illustration + CTA, fade-in
- Row delete: `exit` animation (shrink + fade, 200ms) before re-query

### 6.5 Form Dialogs (Enhanced)

**Current**: Standard `Dialog` with form fields.

**Redesigned**:

- Open: `scale: [0.95, 1]` + `opacity: [0, 1]` + backdrop blur-in (300ms)
- Form fields: Stagger focus ring appearance on mount
- Submit button: Loading spinner replaces text with `AnimatePresence` crossfade
- Success: Dialog shrinks to center + fades, toast glides in from right
- Error: Form fields shake (`x: [0, -5, 5, -5, 0]`) on validation failure
- Close: `scale: [1, 0.95]` + `opacity: [1, 0]` (200ms)

### 6.6 Login Page (Enhanced)

**Current**: Already well-designed with 3D tilt card + Three.js background.

**Enhanced additions**:

- Input focus: Animated border gradient (blue glow trace)
- Password visibility toggle: Eye icon scale-rotate transition
- Submit button: Shiny effect already present, add success state animation
- Error state: Card shake (`x: [0, -8, 8, -4, 4, 0]`) on auth failure
- Success: Card scales up slightly + fades to white, then route transition

---

## 7. Page-Level Designs

### 7.1 Dashboard (New)

Replace the current placeholder with a rich overview:

```
+------------------------------------------------------------------+
| Breadcrumb: Dashboard / Overview                                  |
| Welcome back, Admin — here's what's happening today              |
+------------------------------------------------------------------+
| [Total Users]  [Active Roles]  [Menu Items]  [Dict Entries]     |
|   1,284          8              36            142               |
|   +12.5%        +2 new         No change      -3 today          |
|   [sparkline]   [sparkline]    [sparkline]    [sparkline]       |
+----------------------------------+-------------------------------+
| User Activity Trend              | Recent Activity               |
| [Line chart with path draw]      | - User "john" created (2m)   |
|                                  | - Role "editor" updated (15m) |
|                                  | - Menu structure changed (1h) |
|                                  | - System backup completed     |
+----------------------------------+-------------------------------+
| System Health                                                    |
| [API: 99.9%]  [DB: 42ms]  [Memory: 68%]  [CPU: 23%]             |
| [progress bar] [progress bar] [progress bar] [progress bar]     |
+------------------------------------------------------------------+
```

### 7.2 User Management (Enhanced)

**Layout improvements**:
- Page header: Title + count badge + "Add User" button (right-aligned)
- Filter bar: Search input + role filter dropdown + status filter, collapsible
- Table: Full-width with sticky header, animated row interactions
- Bulk actions: Slide-down bar when rows selected (AnimatePresence)
- Form dialog: Two-column layout for desktop, single-column for mobile

### 7.3 Settings Page (New — Future)

- Tab navigation with `layoutId` active underline
- Sections: Profile, Security, Notifications, Appearance
- Toggle switches with spring animation
- Save button: Bottom-sticky with success feedback

---

## 8. Responsive Design

### Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| `sm` | >= 640px | Stack stat cards 2x2, hide search bar |
| `md` | >= 768px | Sidebar always visible, stat cards 4x1 |
| `lg` | >= 1024px | Full layout, search bar visible |
| `xl` | >= 1280px | Expanded spacing, wider content area |

### Mobile adaptations (< 768px):
- Sidebar: Hidden, replaced with Drawer (slide from left)
- Header: Simplified, hamburger menu + avatar only
- Tags view: Hidden
- Stat cards: 1 column, stacked
- Table: Horizontal scroll with sticky first column
- Form dialogs: Full-screen sheet instead of centered dialog

---

## 9. Dark Mode Strategy

### Implementation

```tsx
// Theme toggle in Zustand store
interface LayoutState {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

// Apply via data-theme attribute on <html>
useEffect(() => {
  document.documentElement.setAttribute("data-theme", theme);
}, [theme]);
```

### Dark mode color mapping:
- Page bg: `#0F172A` (slate-900)
- Surface: `#1E293B` (slate-800)
- Subtle surface: `#334155` (slate-700)
- Border: `#334155` (slate-700)
- Primary text: `#F1F5F9` (slate-100)
- Secondary text: `#CBD5E1` (slate-300)
- Primary blue: `#3B82F6` (brighter for dark bg contrast)
- Primary light: `rgba(59, 130, 246, 0.15)` (semi-transparent)

### Transition:
```css
html {
  transition: background-color 300ms ease, color 300ms ease;
}
```

---

## 10. Accessibility (WCAG AA)

### Color Contrast
- Normal text: >= 4.5:1 (slate-900 on white = 15.8:1 ✓)
- Large text: >= 3:1
- Interactive elements: >= 3:1 against adjacent colors

### Keyboard Navigation
- All interactive elements reachable via Tab
- Visible focus ring: `2px solid var(--color-primary)` with `2px offset`
- Skip to content link at top of page
- Escape closes modals/dropdowns/drawers

### Screen Reader
- Semantic HTML5 (`<nav>`, `<main>`, `<aside>`, `<header>`)
- ARIA labels on icon-only buttons
- `aria-live="polite"` on toast container
- `role="alert"` on error messages

### Motion
- All animations respect `prefers-reduced-motion: reduce`
- No flashing > 3Hz (seizure prevention)
- Parallax/3D effects disabled on touch devices

---

## 11. Implementation Roadmap

### Phase 1: Design Token Migration (1-2 days)
- [ ] Create `tokens.css` with CSS variables
- [ ] Replace hardcoded `#1677FF` with `--color-primary`
- [ ] Replace hardcoded `#666`, `#E5E5E5`, `#F0F2F5` with slate tokens
- [ ] Update Tailwind config to use custom colors

### Phase 2: Dashboard Build (2-3 days)
- [ ] Build `AnimatedCounter` component
- [ ] Build `Sparkline` component
- [ ] Build `StatCard` component with stagger animation
- [ ] Build `TrendChart` with path draw animation
- [ ] Build `ActivityFeed` with stagger
- [ ] Build `SystemHealth` with progress bar animation
- [ ] Assemble Dashboard page

### Phase 3: Component Animation Enhancement (2-3 days)
- [ ] Add `layoutId` active pill to Sidebar
- [ ] Add spring animation to Sidebar collapse
- [ ] Enhance Header search bar expand
- [ ] Add table row FLIP animations
- [ ] Add form dialog shake on error
- [ ] Add skeleton shimmer loading states

### Phase 4: Dark Mode (1-2 days)
- [ ] Implement theme store (Zustand)
- [ ] Add dark mode CSS variables
- [ ] Add toggle in Header
- [ ] Test all pages in dark mode

### Phase 5: Responsive & Polish (1-2 days)
- [ ] Mobile sidebar drawer
- [ ] Responsive stat card grid
- [ ] Touch-optimized table interactions
- [ ] Reduced motion audit
- [ ] Accessibility audit

---

## Appendix: Framer Motion Variant Library

```tsx
// lib/animations.ts — shared animation variants

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

export const slideInRight = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

export const staggerContainer = (stagger = 0.05, delay = 0.1) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

export const springSoft = { type: "spring", stiffness: 260, damping: 26 };
export const springSnappy = { type: "spring", stiffness: 400, damping: 30 };

export const pageTransition = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
};

export const modalTransition = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
};

export const shake = {
  animate: { x: [0, -8, 8, -4, 4, 0] },
  transition: { duration: 0.4 },
};
```

---

**Design System Version**: 2.0
**Date**: 2026-07-29
**Designer**: UI Designer
**Status**: Ready for developer handoff
