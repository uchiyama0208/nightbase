# NightBase Official Website

NightBase is a SaaS platform that modernises night-life venue operations. This repository contains the marketing site built with **Next.js 16 App Router**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, and **Framer Motion**.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to preview the site. The project ships with Japanese (`ja`) and English (`en`) locales—navigate to `/ja` or `/en` to view each language.

## Available Scripts

- `npm run dev` – Start the Next.js development server.
- `npm run build` – Create an optimised production build.
- `npm run start` – Serve the production build locally.
- `npm run lint` – Run ESLint with the Next.js configuration.

## Project Structure

```
src/
  app/
    layout.tsx             # Root layout, global fonts
    page.tsx               # Redirect to the default locale
    [locale]/              # Locale-aware routes (ja / en)
      layout.tsx           # Navbar, footer, metadata per locale
      page.tsx             # Homepage composed of hero, sections, CTA
      features/            # Feature overview + detail pages
      pricing/             # Pricing plans and FAQ
      case-studies/        # Customer stories + dynamic detail pages
      about/               # Mission, vision, team, and company info
      security/            # Security and compliance highlights
      blog/                # Journal overview + placeholder posts
      contact/             # Inquiry form + thanks page
      privacy-policy/      # Legal pages
      terms-of-service/
      company/
  components/              # Reusable UI building blocks
  content/                 # 日本語のコンテンツデータ
  lib/                     # ユーティリティ関数
public/
  favicon.svg              # Vector favicon
```

## Styling & Components

- **Tailwind CSS** for utility-first styling with Apple-inspired palettes (`primary #0088FF`, `secondary #FFCC00`, white background).
- **shadcn/ui primitives** (e.g., Button) with custom theming for rounded Apple-like controls.
- **Framer Motion** powers subtle hero animations.
- Global fonts use Inter and Noto Sans JP via `next/font`.

## 言語対応

公式サイトは日本語のみで提供しています。コンテンツは `src/content/site.ts` に構造化データとして定義され、各ページから直接参照されます。

## Forms

The contact form is a client component with optimistic submission feedback. Integrate with your preferred backend or form provider by replacing the simulated submit handler inside `src/components/ContactForm.tsx`.
