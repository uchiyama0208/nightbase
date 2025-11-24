# AI Coding Assistant Rules

This document outlines the coding standards and design guidelines for this project. All AI assistants must adhere to these rules.

## Design Guidelines

### Modal (Dialog) Design
- **Background Color**:
  - Light Mode: White (`bg-white`)
  - Dark Mode: Dark Gray / Slate (`dark:bg-slate-950` or `dark:bg-gray-800`)
  - **Rule**: Modals must be white by default and switch to a dark background only in dark mode.
- **Text Color**:
  - Light Mode: Dark Gray / Black (`text-slate-900`, `text-gray-900`)
  - Dark Mode: White / Light Gray (`dark:text-slate-50`, `dark:text-gray-100`)
  - **Rule**: Ensure high contrast and readability.
- **Border**:
  - Light Mode: Light Gray (`border-slate-200`)
  - Dark Mode: Subtle White/Transparent (`dark:border-white/10`)

### General UI/UX
- **Responsiveness**: All components must be responsive. Use standard breakpoints (sm, md, lg, xl).
- **Dark Mode Support**: All components must support dark mode using the `dark:` prefix.
- **Tailwind CSS**: Use Tailwind CSS for all styling. Avoid inline styles.

## Component Specific Rules

### Dialog (Modal)
The `DialogContent` component in `@/components/ui/dialog.tsx` has been configured with default styles that adhere to the modal design guidelines.
- Do NOT override the background color of `DialogContent` unless strictly necessary for a specific variant.
- Use `DialogHeader`, `DialogTitle`, `DialogDescription`, and `DialogFooter` for consistent layout.

## Code Style
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (useState, useEffect, etc.) or Server Actions.

## Table Design Guidelines

### Standard Table Layout
All tables in the `/app` directory must follow these standards for consistency:

#### Column Layout
- **Equal Width**: Use Tailwind width classes to ensure columns are equally sized:
  - For 3 columns: `w-1/3` on mobile, `md:w-1/6` on desktop (if desktop has 6 columns)
  - For 4 columns: `w-1/4` on both mobile and desktop
  - For 6 columns: `w-1/6` on desktop
  - Adjust responsively based on the number of visible columns per viewport
- **Text Alignment**: All headers and cells must be center-aligned (`text-center`)
- **Responsive Display**: Use `hidden md:table-cell` for non-essential columns on mobile

#### Example Table Header
```tsx
<TableHead className="text-gray-900 dark:text-white font-semibold text-center w-1/3 md:w-1/6">
  Column Name
</TableHead>
```

#### Example Table Cell
```tsx
<TableCell className="text-center">
  Cell Content
</TableCell>
```

#### Mobile-First Approach
- On mobile (< 768px), show only the most essential 3-4 columns
- On desktop (≥ 768px), show all columns including actions
- Operations/actions column should be hidden on mobile using `hidden md:table-cell`

