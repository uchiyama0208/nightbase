# AI Coding Assistant Rules (NightBase App)

NightBase アプリ（`apps/app`）のデザインとコードを統一するためのルールです。  
**どの AI がコーディングしても同じ見た目・体験になること**を目的とします。

---

## 0. 前提

- フレームワーク: **Next.js App Router**
- 言語: **TypeScript**
- UI 基盤: **Tailwind CSS + shadcn/ui**
- ダークモード: `class` 切り替え（`dark:` プレフィックス）
- ページはすべて **業務アプリっぽいモダンな見た目**（Linear / Notion / Vercel 風）

---

## 1. 全体デザインのコンセプト

- **モダンでシンプルな業務アプリ**
- 角丸・余白・行間をしっかりとり、詰め込みすぎない
- ライトモード: 「白 + 薄いグレー + ブランドブルー」
- ダークモード: 「濃いネイビー / スレート + アクセントブルー」
- 影は控えめに、**カードの境界は「角丸 + 薄いボーダー」メイン**

---

## 2. レイアウトの基本

### 2-1. ページコンテナ

- ページコンポーネント（`app/*/page.tsx`）は、基本的に以下の構造にする：

```tsx
// page.tsx 例
export default function Page() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* 左のサイドバーは既存のレイアウトに任せる */}
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {/* ページヘッダー */}
          {/* コンテンツ */}
        </div>
      </main>
    </div>
  );
}
背景色（アプリ全体）

Light: bg-slate-50

Dark: dark:bg-slate-950

2-2. ページヘッダー
各ページの最上部には タイトル + サブ説明 + 右側アクション を置く：

tsx
コードをコピーする
<div className="mb-4 flex items-center justify-between gap-3">
  <div>
    <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
      ページタイトル
    </h1>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
      ページの簡単な説明テキスト。
    </p>
  </div>
  {/* 右側アクション（ボタンなど） */}
</div>
3. デザイントークン（クラス指定ルール）
3-1. 角丸（Border Radius）
入力フィールド・ボタン: rounded-lg

小さなチップ / バッジ: rounded-full or rounded-xl

カード / パネル / モーダル: rounded-2xl

テーブル行の一番外側カード: rounded-2xl

ルール:
新しい UI を作るときは必ずこのどれかを使い、独自の rounded-* は追加しない。

3-2. カード（パネル）のスタイル
標準カード（ダッシュボード、設定パネル、セクションなど）は必ず以下：

tsx
コードをコピーする
<div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm
                dark:border-slate-800 dark:bg-slate-900/80">
  {/* コンテンツ */}
</div>
余白は p-4（内部のレイアウトでさらに gap-3 などを使う）

セクション間は space-y-4 または gap-4 を使う

3-3. フォント / タイポグラフィ
ベース文字: text-sm text-slate-900 dark:text-slate-50

補足説明: text-xs text-slate-500 dark:text-slate-400

セクションタイトル: text-sm font-semibold text-slate-900 dark:text-slate-50

ページタイトル: text-xl font-semibold

4. コンポーネントごとのルール
4-1. ボタン（shadcn Button）
原則として shadcn/ui の <Button> を使う。
生の <button> を直接スタイルしない（特殊ケースを除く）。

Primary ボタン（青）例：

tsx
コードをコピーする
<Button className="rounded-lg px-4 py-2 text-sm font-medium">
  保存する
</Button>

### Rounded Design (Corner Radius)
- **Container Elements** (Card, Dialog, Table Wrapper):
  - Use `rounded-3xl` (24px) for a soft, modern look.
- **Input Elements** (Input, Select, Button):
  - Use `rounded-full` (Fully rounded) or `rounded-2xl` (16px) for interactive elements.
- **Small Elements** (Checkbox, Badge):
  - Use `rounded-md` to `rounded-full` depending on the context.
- **General Rule**: Prioritize softer, more rounded corners over sharp ones to create a friendly UI.

### General UI/UX
Secondary（アウトライン）：

tsx
コードをコピーする
<Button variant="outline" className="rounded-lg border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-100">
  キャンセル
</Button>
破壊的アクション:

tsx
コードをコピーする
<Button variant="destructive" className="rounded-lg">
  削除する
</Button>
ルール:

必ず rounded-lg を付与する

アイコン付きは gap-2 を付ける：className="rounded-lg gap-2"

4-2. 入力フォーム（Input / Textarea / Select）
原則として shadcn/ui の <Input>, <Textarea>, <Select> を使う。

ラベル + 入力の組み合わせ：

tsx
コードをコピーする
<div className="space-y-1.5">
  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
    ラベル
  </label>
  <Input
    placeholder="テキストを入力"
    className="h-9 rounded-lg border-slate-200 bg-white/80 text-sm
               focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0
               dark:border-slate-700 dark:bg-slate-900/80"
  />
  <p className="text-xs text-slate-500 dark:text-slate-400">
    補足説明テキスト（任意）
  </p>
</div>
ルール:

rounded-lg を統一して使う

h-9 or h-10 を使い、バラバラな高さにしない

フォームは基本 space-y-3 で縦に並べる

4-3. モーダル（Dialog）
必ず shadcn/ui の <Dialog> 系を使用。

DialogContent は次のスタイルをベースとする（上書き禁止・拡張のみ）：

tsx
コードをコピーする
<DialogContent className="max-w-lg rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xl
                          dark:border-slate-800 dark:bg-slate-900/90">
  <DialogHeader className="space-y-1.5">
    <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
      モーダルタイトル
    </DialogTitle>
    <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
      説明テキスト
    </DialogDescription>
  </DialogHeader>

  {/* 本文内容 */}

  <DialogFooter className="mt-4 flex justify-end gap-2">
    {/* ボタンたち */}
  </DialogFooter>
</DialogContent>
ルール:

背景は Light: bg-white/90 / Dark: dark:bg-slate-900/90

rounded-2xl 固定（角丸をバラバラにしない）

モーダル内のフォーム・テーブルも上記フォーム/テーブルルールに従う

4-4. テーブル
既存の Table ガイドラインに加え、NightBase 用の標準スタイルを定義：

tsx
コードをコピーする
<Card className="rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
  <Table>
    <TableHeader>
      <TableRow className="border-b border-slate-200/80 dark:border-slate-800">
        <TableHead className="w-1/6 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          日付
        </TableHead>
        {/* ... */}
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="border-b border-slate-100 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-900/80">
        <TableCell className="py-3 text-center text-sm text-slate-900 dark:text-slate-50">
          2025-11-25
        </TableCell>
        {/* ... */}
      </TableRow>
    </TableBody>
  </Table>
</Card>
ルール:

列ヘッダは text-xs font-semibold uppercase text-slate-500

セルは text-sm text-slate-900 dark:text-slate-50

行ホバー時は hover:bg-slate-50/70（Dark: dark:hover:bg-slate-900/80）

モバイルでは hidden md:table-cell で不要な列を隠す

4-5. バッジ / ステータスピル
出勤状態・ステータス表示などは以下のようなピルを使う：

tsx
コードをコピーする
<span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700
                 dark:bg-emerald-900/40 dark:text-emerald-100">
  完了
</span>
別バリエーション：bg-amber-50 / text-amber-700（警告）、bg-rose-50 / text-rose-700（エラー）など。

4-6. ダークモード
新しいコンポーネントは 必ず dark: スタイルも定義する。

背景色ルールの例：

カード: bg-white/80 dark:bg-slate-900/80

ボーダー: border-slate-200/80 dark:border-slate-800

テキスト: text-slate-900 dark:text-slate-50

補足: text-slate-500 dark:text-slate-400

5. ページレベルのパターン
5-1. ダッシュボード
上部に 大きめカード（出勤するボタン） を1枚配置

rounded-2xl, bg-blue-600 のような特色があって OK

下に 2〜3 カラムのカードを並べる

grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3

5-2. 一覧ページ（出勤一覧 / タイムカード）
構成：

ページヘッダー

フィルタバー（検索・日付）

テーブルカード

フィルタバー例：

tsx
コードをコピーする
<div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex flex-1 gap-2">
    <Input ... />   {/* 検索 */}
    {/* 日付ピッカーなど */}
  </div>
  <div className="flex gap-2">
    {/* アクションボタン */}
  </div>
</div>
6. コーディングスタイル（AI 向け共通ルール）
必ず既存の shadcn コンポーネントを優先使用する

Button, Input, Select, Dialog, Table, Sheet, Tabs など

生の HTML 要素に Tailwind を直接貼るのは

shadcn に相当コンポーネントがない場合のみ

クラスの順序は気にしなくて良いが、

rounded-*, border-*, bg-*, text-*, shadow-* などの粒度を統一する

新しいコンポーネントを作る際は、

まず「既存の見た目に近いカード + フォーム」を template としてコピーしてから変更する

デザインを壊す可能性のあることは禁止：

独自の bg- を多用しない

rounded-none, border-0 でフラットにしない

影を強くしすぎない（shadow-lg 以上は禁止）

7. 例：新規ページのテンプレート
新しい設定ページを作るときの基本パターン：

tsx
コードをコピーする
export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            設定タイトル
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            この設定ページの説明テキスト。
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          {/* フォームセクション */}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          {/* 別セクション */}
        </div>
      </div>
    </div>
  );
}
以上のルールに従って、NightBase アプリ (apps/app) の UI は
ライト / ダーク両対応の統一された業務アプリデザインになるように実装してください。