# コンポーネントテンプレート

## ボタン（shadcn Button）

原則として shadcn/ui の `<Button>` を使う。生の `<button>` を直接スタイルしない。

```tsx
// Primary
<Button className="rounded-lg px-4 py-2 text-sm font-medium">
  保存する
</Button>

// Secondary
<Button variant="outline" className="rounded-lg">
  キャンセル
</Button>

// Destructive
<Button variant="destructive" className="rounded-lg">
  削除する
</Button>

// Icon Button (丸いプラスボタンなど)
<Button
  size="icon"
  className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
>
  <Plus className="h-5 w-5" />
</Button>
```

---

## 入力フォーム

### 標準サイズ

- **高さ**: `h-9`（36px）
- **文字サイズ**: `text-base`（16px）

```tsx
<div className="space-y-1.5">
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
    ラベル
  </label>
  <Input
    placeholder="テキストを入力"
    className="h-9 text-base rounded-lg border-gray-200 bg-white
               focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0
               dark:border-gray-700 dark:bg-gray-900"
  />
</div>
```

### Selectも同様

```tsx
<SelectTrigger className="h-9 text-base">
  <SelectValue placeholder="選択してください" />
</SelectTrigger>
```

---

## モーダル（Dialog）

### 標準パターン（必須）

すべてのモーダルは以下の標準パターンに従う：

| 要素 | クラス/値 |
|------|-----------|
| DialogContent | `sm:max-w-[425px] w-[95%] max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-0 flex flex-col` |
| DialogHeader | `sticky top-0 z-10 bg-white dark:bg-gray-900 flex flex-row items-center gap-2 h-14 border-b border-gray-200 dark:border-gray-700 px-6` |
| 戻るボタン | `h-8 w-8` ボタン、`h-4 w-4` アイコン |
| DialogTitle | `text-lg font-semibold text-gray-900 dark:text-white` |
| 右スペーサー | `w-8 h-8` |
| コンテンツエリア | `flex-1 overflow-y-auto px-6 py-4` |

### フォーム/詳細モーダル（戻るボタン付き）

```tsx
import { ChevronLeft } from "lucide-react";

<Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[425px] w-[95%] max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-0 flex flex-col">
        <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex flex-row items-center gap-2 h-14 border-b border-gray-200 dark:border-gray-700 px-6">
            <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                aria-label="戻る"
            >
                <ChevronLeft className="h-4 w-4" />
            </button>
            <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white">
                モーダルタイトル
            </DialogTitle>
            <div className="w-8 h-8" /> {/* 右スペーサー */}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* コンテンツ */}
        </div>

        <div className="flex-shrink-0 px-6 pb-6 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="rounded-lg">
                キャンセル
            </Button>
            <Button className="rounded-lg">
                保存
            </Button>
        </div>
    </DialogContent>
</Dialog>
```

### 確認ダイアログ（戻るボタンなし）

削除確認や退勤確認など、シンプルなアクション確認には戻るボタンは不要：

```tsx
<Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[425px] w-[95%] max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 p-6">
        <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white text-center">
                確認
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
                この操作を実行しますか？
            </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
            <Button onClick={handleAction} className="w-full">
                実行する
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full">
                キャンセル
            </Button>
        </div>
    </DialogContent>
</Dialog>
```

### セレクターモーダル（検索バー付き）

ゲスト選択やキャスト選択など、リスト検索が必要なモーダル：

```tsx
<Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[425px] w-[95%] max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-0 flex flex-col">
        <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex flex-row items-center gap-2 h-14 border-b border-gray-200 dark:border-gray-700 px-6">
            <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                aria-label="戻る"
            >
                <ChevronLeft className="h-4 w-4" />
            </button>
            <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white">
                選択
            </DialogTitle>
            <div className="w-8 h-8" />
        </DialogHeader>

        {/* 検索バー */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="検索..." className="pl-9 h-10 rounded-lg" />
            </div>
        </div>

        {/* リスト（スクロール可能） */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
            {/* リストアイテム */}
        </div>

        <div className="flex-shrink-0 px-6 pb-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="rounded-lg">
                キャンセル
            </Button>
            <Button onClick={handleConfirm} className="rounded-lg">
                確定
            </Button>
        </div>
    </DialogContent>
</Dialog>
```

### 戻るボタンの標準パターン

すべてのモーダル（確認ダイアログを除く）では、以下の標準戻るボタンパターンを使用する：

```tsx
<button
    type="button"
    onClick={onClose}
    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
    aria-label="戻る"
>
    <ChevronLeft className="h-4 w-4" />
</button>
```

| 要素 | 値 |
|------|---|
| ボタンサイズ | `h-8 w-8` |
| アイコンサイズ | `h-4 w-4` |
| 形状 | `rounded-full` |
| アイコン | `ChevronLeft`（ArrowLeftは使用禁止）|
| ライトモード色 | `text-gray-500` → hover: `text-gray-900 bg-gray-100` |
| ダークモード色 | `dark:text-gray-400` → hover: `dark:text-gray-100 dark:bg-gray-700` |

### 重要なルール

1. **戻るボタン**: フォーム/詳細モーダルには必ず左上に `ChevronLeft` アイコンの戻るボタンを配置
2. **モバイル対応**: `w-[95%] max-h-[90vh] overflow-y-auto` で画面からはみ出さない
3. **パディング**: 標準は `p-6`（セレクターモーダルは `p-0` で内部でパディング管理）
4. **タイトルサイズ**: `text-lg font-semibold`
5. **タイトル中央揃え**: 戻るボタンがある場合は右にスペーサー `w-8 h-8` を配置
6. **マージン**: DialogHeader に `mb-4` を付与

```tsx
// ❌ NG
<DialogContent className="max-w-md rounded-2xl ...">  // モバイル幅なし、max-hなし
<DialogTitle className="text-base ...">  // text-lg ではない
// 戻るボタンなし

// ✅ OK
<DialogContent className="sm:max-w-[425px] w-[95%] max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 p-6">
<DialogHeader className="flex flex-row items-center gap-2 mb-4">
    <button>戻るボタン</button>
    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white">
```

---

## テーブル

```tsx
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// 外側のラッパー: 角丸、ボーダー、白背景
<div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
    <Table>
        <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                {/* 各列は均等幅(w-1/N)、中央揃え */}
                <TableHead className="w-1/5 text-center text-gray-900 dark:text-gray-100">列名1</TableHead>
                <TableHead className="w-1/5 text-center text-gray-900 dark:text-gray-100">列名2</TableHead>
                {/* ... */}
            </TableRow>
        </TableHeader>
        <TableBody>
            {/* 空の場合 */}
            {items.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        データがありません
                    </TableCell>
                </TableRow>
            ) : (
                items.map(item => (
                    <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        onClick={() => handleClick(item)}
                    >
                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                            {item.field1}
                        </TableCell>
                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                            {item.field2}
                        </TableCell>
                        {/* ... */}
                    </TableRow>
                ))
            )}
        </TableBody>
    </Table>
</div>
```

**ポイント:**
- 外側ラッパー: `rounded-3xl`, `border border-gray-200 dark:border-gray-700`, `bg-white dark:bg-gray-900`, `overflow-hidden`
- ヘッダー行: `bg-gray-50 dark:bg-gray-800/50`
- 各セル: 均等幅 (`w-1/N`)、`text-center`、`text-gray-900 dark:text-gray-100`
- ホバー: `hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`
- クリック可能な行: `cursor-pointer`

---

## トグルボタン

```tsx
const [activeIndex, setActiveIndex] = useState(0);

<div className="relative inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
    <div
        className="absolute h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-in-out"
        style={{
            width: "80px",
            left: "4px",
            transform: `translateX(calc(${activeIndex} * (80px + 0px)))`
        }}
    />
    <button
        type="button"
        onClick={() => setActiveIndex(0)}
        className={`relative z-10 w-20 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${activeIndex === 0 ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
    >
        オプション1
    </button>
    <button
        type="button"
        onClick={() => setActiveIndex(1)}
        className={`relative z-10 w-20 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${activeIndex === 1 ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
    >
        オプション2
    </button>
</div>
```

---

## アイコンボタン

### メニューボタン（MoreHorizontal）

ドロップダウンメニューを開くボタンに使用：

```tsx
import { MoreHorizontal } from "lucide-react";

<button
    type="button"
    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
>
    <MoreHorizontal className="h-4 w-4" />
</button>
```

| 要素 | 値 |
|------|---|
| ボタンサイズ | `h-8 w-8` |
| アイコンサイズ | `h-4 w-4` |
| 形状 | `rounded-full` |
| ライトモード色 | `text-gray-500` → hover: `text-gray-900 bg-gray-100` |
| ダークモード色 | `dark:text-gray-400` → hover: `dark:text-gray-100 dark:bg-gray-700` |

### 削除ボタン（Trash2）

#### ドロップダウンメニュー内

```tsx
import { Trash2 } from "lucide-react";

<button
    type="button"
    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
>
    <Trash2 className="h-4 w-4" />
    削除
</button>
```

#### アイコンボタンとして単独使用

```tsx
import { Trash2 } from "lucide-react";

<button
    type="button"
    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
>
    <Trash2 className="h-4 w-4" />
</button>
```

| 要素 | 値 |
|------|---|
| アイコンサイズ | `h-4 w-4` |
| ライトモード色 | `text-red-500` または `text-red-600` |
| ダークモード色 | `dark:text-red-400` |
| ホバー背景 | `hover:bg-red-50 dark:hover:bg-red-900/20` |

---

## VercelTabs（タブナビゲーション）

Vercelスタイルのアニメーション付きタブコンポーネント：

```tsx
import { VercelTabs } from "@/components/ui/vercel-tabs";

const tabs = [
    { key: "all", label: "すべて" },
    { key: "active", label: "進行中" },
    { key: "completed", label: "完了" },
];

// カウント表示付き
const tabsWithCount = [
    { key: "pending", label: "未完了", count: 5 },
    { key: "completed", label: "完了", count: 12 },
];

<VercelTabs
    tabs={tabs}
    value={activeTab}
    onChange={(val) => setActiveTab(val)}
    className="mb-4"
/>
```

| Props | 型 | 説明 |
|-------|------|------|
| tabs | `{ key: string; label: string; count?: number }[]` | タブ定義配列 |
| value | `string` | 現在選択中のタブキー |
| onChange | `(value: string) => void` | タブ変更時のコールバック |
| className | `string?` | 追加のクラス名 |

---

## StatusBadge（ステータスバッジ）

ステータス文字列から自動的に色とラベルを設定するバッジ：

```tsx
import { StatusBadge, Badge } from "@/components/ui/badge";

// StatusBadge: ステータス文字列から自動判定
<StatusBadge status="working" />           // → 緑色で「出勤中」
<StatusBadge status="pending" />           // → 黄色で「申請中」
<StatusBadge status="scheduled" />         // → 青色で「予定」
<StatusBadge status="absent" />            // → 赤色で「欠勤」
<StatusBadge status="completed" />         // → 緑色で「完了」

// カスタムラベル
<StatusBadge status="working" label="勤務中" />

// サイズ指定
<StatusBadge status="pending" size="xs" />  // 極小
<StatusBadge status="pending" size="sm" />  // 小（デフォルト）
<StatusBadge status="pending" size="default" />  // 標準

// Badge直接使用（バリアント指定）
<Badge variant="scheduled">予定</Badge>
<Badge variant="working">出勤中</Badge>
<Badge variant="warning">退勤忘れ</Badge>
```

### 利用可能なステータス

| status | variant | ラベル | 色 |
|--------|---------|--------|-----|
| scheduled | scheduled | 予定 | 青 |
| working | working | 出勤中 | 緑 |
| finished | finished | 完了 | グレー |
| absent | absent | 欠勤 | 赤 |
| forgot_clockout | warning | 退勤忘れ | 黄 |
| pending | pending | 申請中 | 黄 |
| approved | approved | 承認済み | 青 |
| rejected | rejected | 却下 | 赤 |
| completed | completed | 完了 | 緑 |
| cancelled | cancelled | キャンセル | グレー |

---

## EmptyState（空状態）

データがない時の表示コンポーネント：

### カード/コンテナ用

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Inbox, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

<EmptyState
    icon={Inbox}
    title="データがありません"
    description="まだデータが登録されていません"
    action={
        <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            新規作成
        </Button>
    }
/>

// シンプル版（アイコンなし）
<EmptyState description="検索結果がありません" />
```

### テーブル用

```tsx
import { TableEmptyState } from "@/components/ui/empty-state";

<TableBody>
    {items.length === 0 ? (
        <TableEmptyState colSpan={5} description="データがありません" />
    ) : (
        items.map(item => <TableRow key={item.id}>...</TableRow>)
    )}
</TableBody>
```

### インライン用

```tsx
import { InlineEmptyState } from "@/components/ui/empty-state";

<InlineEmptyState description="該当するデータがありません" />
```

---

## ConfirmDialog（確認ダイアログ）

削除確認やアクション確認に使用：

### 基本の確認ダイアログ

```tsx
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const [open, setOpen] = useState(false);

<ConfirmDialog
    open={open}
    onOpenChange={setOpen}
    title="この操作を実行しますか？"
    description="確認後、処理が開始されます。"
    confirmLabel="実行する"
    cancelLabel="キャンセル"
    onConfirm={async () => {
        await doSomething();
        setOpen(false);
    }}
/>
```

### 削除確認ダイアログ（プリセット）

```tsx
import { DeleteConfirmDialog } from "@/components/ui/confirm-dialog";

<DeleteConfirmDialog
    open={open}
    onOpenChange={setOpen}
    itemName="このアイテム"  // → "このアイテムを削除しますか？"
    onConfirm={async () => {
        await deleteItem();
        setOpen(false);
    }}
/>

// カスタムメッセージ
<DeleteConfirmDialog
    open={open}
    onOpenChange={setOpen}
    title="店舗データを削除しますか？"
    description="この操作は取り消せません。すべてのデータが永久に削除されます。"
    onConfirm={handleDelete}
/>
```

| Props | 型 | 説明 |
|-------|------|------|
| open | `boolean` | ダイアログの開閉状態 |
| onOpenChange | `(open: boolean) => void` | 開閉状態変更時のコールバック |
| title | `string` | ダイアログタイトル |
| description | `string?` | 説明文 |
| confirmLabel | `string?` | 確認ボタンのラベル（デフォルト: "確認"） |
| cancelLabel | `string?` | キャンセルボタンのラベル（デフォルト: "キャンセル"） |
| variant | `"default" \| "destructive"` | スタイルバリアント |
| onConfirm | `() => void \| Promise<void>` | 確認時のコールバック |
| loading | `boolean?` | 外部からのローディング状態 |

---

## SearchInput（検索入力）

クリアボタン付きの検索入力：

```tsx
import { SearchInput } from "@/components/ui/search-input";

// 基本
<SearchInput
    value={searchQuery}
    onChange={setSearchQuery}
    placeholder="名前で検索..."
/>

// デバウンス付き（300ms後にonSearchを呼ぶ）
<SearchInput
    value={searchQuery}
    onChange={setSearchQuery}
    onSearch={(value) => fetchResults(value)}
    debounceMs={300}
    placeholder="検索..."
/>

// ラベル付き
import { SearchInputWithLabel } from "@/components/ui/search-input";

<SearchInputWithLabel
    label="キャスト検索"
    value={searchQuery}
    onChange={setSearchQuery}
    placeholder="名前を入力..."
/>
```

| Props | 型 | 説明 |
|-------|------|------|
| value | `string?` | 入力値（controlled） |
| onChange | `(value: string) => void` | 値変更時のコールバック |
| onSearch | `(value: string) => void` | 検索実行時のコールバック |
| placeholder | `string?` | プレースホルダー |
| debounceMs | `number?` | デバウンス時間（ミリ秒） |
| autoFocus | `boolean?` | 自動フォーカス |

---

## Skeleton（スケルトンローダー）

ローディング中のプレースホルダー表示：

### 基本スケルトン

```tsx
import { Skeleton, SkeletonText, SkeletonAvatar } from "@/components/ui/skeleton";

// 基本（カスタムサイズ）
<Skeleton className="h-4 w-32 rounded" />
<Skeleton className="h-10 w-10 rounded-full" />

// プリセット
<SkeletonText />           // h-4 w-full
<SkeletonHeading />        // h-6 w-48
<SkeletonAvatar />         // h-10 w-10 rounded-full
<SkeletonButton />         // h-10 w-24 rounded-lg
```

### カード用スケルトン

```tsx
import { SkeletonCard } from "@/components/ui/skeleton";

<SkeletonCard />
```

### テーブル行用スケルトン

```tsx
import { SkeletonTableRow } from "@/components/ui/skeleton";

<TableBody>
    {isLoading ? (
        <>
            <SkeletonTableRow columns={5} />
            <SkeletonTableRow columns={5} />
            <SkeletonTableRow columns={5} />
        </>
    ) : (
        items.map(item => <TableRow key={item.id}>...</TableRow>)
    )}
</TableBody>
```

### リストアイテム用スケルトン

```tsx
import { SkeletonListItem } from "@/components/ui/skeleton";

<div className="divide-y">
    <SkeletonListItem />
    <SkeletonListItem />
    <SkeletonListItem />
</div>
```

### ページ全体用スケルトン

```tsx
import { SkeletonPage } from "@/components/ui/skeleton";

// ページ全体のローディング表示
{isLoading ? <SkeletonPage /> : <ActualContent />}
