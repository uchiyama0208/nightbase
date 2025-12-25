# デザインシステム

## コンセプト

- **モダンでシンプルな業務アプリ**（Linear / Notion / Vercel 風）
- 角丸・余白・行間をしっかりとり、詰め込みすぎない
- ライトモード: 「白 + 薄いグレー + ブランドブルー」
- ダークモード: 「濃いネイビー / スレート + アクセントブルー」
- 影は控えめに、**カードの境界は「角丸 + 薄いボーダー」メイン**

---

## デザイントークン

### 角丸（Border Radius）
| 用途 | クラス |
|------|--------|
| コンテナ要素（Card, Dialog, Table Wrapper） | `rounded-3xl`（24px） |
| 入力要素（Input, Select, Button） | `rounded-full` または `rounded-2xl` |
| 小さな要素（Checkbox, Badge） | `rounded-md` 〜 `rounded-full` |

### 背景色
| 用途 | クラス |
|------|--------|
| カード | `bg-white dark:bg-gray-900` |
| アプリ全体 | `bg-slate-50 dark:bg-slate-950` |

### テキスト色
| 用途 | クラス |
|------|--------|
| ベース文字 | `text-gray-900 dark:text-gray-100` |
| 補足説明 | `text-muted-foreground` または `text-gray-500 dark:text-gray-400` |

### ボーダー
| 用途 | クラス |
|------|--------|
| 標準 | `border-gray-200 dark:border-gray-700` |

---

## 文字サイズルール

### ページタイトル
- サイズ: `text-xl`
- ウェイト: `font-bold`
- 色: `text-gray-900 dark:text-white`

```tsx
<h1 className="text-xl font-bold text-gray-900 dark:text-white">
    ページタイトル
</h1>
```

### セクションタイトル
- サイズ: `text-lg` または `text-base`
- ウェイト: `font-semibold`
- 色: `text-gray-900 dark:text-white`

### 説明文
- サイズ: `text-sm`
- 色: `text-gray-600 dark:text-gray-400`

### ラベル
- サイズ: `text-sm`
- ウェイト: `font-medium`
- 色: `text-gray-700 dark:text-gray-200`

### 本文テキスト
- サイズ: `text-sm` または `text-base`
- 色: `text-gray-900 dark:text-white`

### 補足・注釈
- サイズ: `text-xs`
- 色: `text-gray-500 dark:text-gray-400`

---

## アイコンルール

### 戻るボタン
- **必ず `ChevronLeft` を使用する**（`ArrowLeft` は使用禁止）
- サイズ: `h-5 w-5`
- 色: `text-gray-600 dark:text-gray-400`

```tsx
import { ChevronLeft } from "lucide-react";

// ✅ OK
<ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />

// ❌ NG - ArrowLeftは使用禁止
<ArrowLeft className="h-5 w-5" />
```

### その他のアイコン
- サイズ: 通常 `h-5 w-5`、小さい場合 `h-4 w-4`
- ボタン内アイコン: `h-5 w-5`

---

## テキスト色の明示的指定（重要）

**shadcn/ui コンポーネントのテキスト色は必ず明示的に指定すること。**

shadcn/ui の `CardTitle`, `CardDescription`, `DialogTitle` などはデフォルトのテキスト色が薄く、白背景で見えにくくなる場合がある。

```tsx
// ❌ NG - デフォルト色に依存（見えにくくなる可能性）
<CardTitle>タイトル</CardTitle>
<CardDescription>説明文</CardDescription>

// ✅ OK - 明示的にテキスト色を指定
<CardTitle className="text-gray-900 dark:text-white">タイトル</CardTitle>
<CardDescription className="text-gray-600 dark:text-gray-400">説明文</CardDescription>
```

**標準テキスト色:**
- タイトル・見出し: `text-gray-900 dark:text-white`
- 説明文・補足: `text-gray-600 dark:text-gray-400`
- ラベル: `text-gray-900 dark:text-white` または `text-gray-700 dark:text-gray-200`

---

## カラーパレット統一ルール

### Gray vs Slate

**gray を使用し、slate は使用禁止**

```tsx
// ✅ OK - gray系を使用
bg-gray-100 dark:bg-gray-800
text-gray-900 dark:text-gray-100
border-gray-200 dark:border-gray-700

// ❌ NG - slate系は使用禁止
bg-slate-100 dark:bg-slate-800
text-slate-900 dark:text-slate-100
border-slate-200 dark:border-slate-700
```

**例外:** アプリ全体の背景色のみ `bg-slate-50 dark:bg-slate-950` を許可

---

## Loader2 スピナーサイズ

| 用途 | サイズ | 例 |
|------|--------|-----|
| ボタン内 | `h-4 w-4` | `<Loader2 className="h-4 w-4 mr-2 animate-spin" />` |
| インライン | `h-4 w-4` | 小さなローディング表示 |
| カード/セクション | `h-6 w-6` | 部分的なローディング |
| ページ全体 | `h-8 w-8` | `<Loader2 className="h-8 w-8 animate-spin text-blue-500" />` |

```tsx
// ボタン内（h-4 w-4）
<Button disabled={loading}>
    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
    保存
</Button>

// ページ全体（h-8 w-8）
<div className="flex items-center justify-center py-12">
    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
</div>
```

---

## 小テキストサイズ

| 用途 | クラス | 備考 |
|------|--------|------|
| 補足・注釈 | `text-xs` | 標準の小テキスト |
| 極小（特殊用途のみ） | `text-[10px]` | バッジ内など |

**禁止:**
- `text-[9px]` - 小さすぎる
- `text-[11px]` - `text-xs` を使用
- `text-[8px]` - 小さすぎる

---

## シャドウ

| 用途 | クラス |
|------|--------|
| カード | `shadow-sm` |
| ホバー時 | `shadow-md` |
| モーダル/ドロップダウン | `shadow-xl` |

**禁止:** `shadow-lg` 以上（モーダル除く）

---

## スペーシング

### ギャップ（gap）
- ボタン間: `gap-2`
- フォームフィールド間: `gap-4`

### スペース（space-y）
- フォーム内: `space-y-4`
- リスト内: `space-y-2`
- ラベル〜入力間: `space-y-1.5`

### パディング
- モーダル内容: `px-6 py-4`
- カード: `p-4` または `p-6`
- ボタン: `px-4 py-2`
