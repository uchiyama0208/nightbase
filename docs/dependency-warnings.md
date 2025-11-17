# Dependency Warnings

This project inherits a handful of npm warnings during `npm install` on Vercel. The table below documents the current state and rationale behind each warning so we can track upstream fixes without destabilising the app.

| Package | Status | Notes |
| --- | --- | --- |
| `eslint@9.13.0` | ✅ Updated | Direct dependency bumped together with `eslint-config-next@15.0.3`. This removes the deprecated `@humanwhocodes/*` transitive packages that ESLint 8 pulled in. |
| `@humanwhocodes/object-schema`, `@humanwhocodes/config-array` | ✅ Resolved upstream | No longer pulled in after the ESLint 9 upgrade. |
| `glob@7.2.3`, `inflight@1.0.6`, `rimraf@3.0.2` | ⚠️ Still emitted by npm | These packages come from deeply nested dependencies inside the current Next.js 16 / Turbopack toolchain (e.g. `@next/swc-*` and `@vercel/nft`). They are pinned by Next.js and cannot be overridden safely without forking the framework. We should re-check the warnings whenever Next.js publishes updated builds. |
| `eslint@8.57.1` | ✅ Eliminated | Superseded by the direct update described above. |

If additional warnings appear, capture the upstream package that introduces them here before attempting any overrides.
