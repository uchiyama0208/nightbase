"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { toDateTimeLocalInputValue } from "@/lib/utils";

const editorSchema = z.object({
  id: z.string().optional(),
  previousSlug: z.string().optional(),
  title: z.string().min(1, "タイトルは必須です"),
  slug: z.string().min(1, "スラッグは必須です"),
  content: z.string().optional().nullable(),
  excerpt: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  categories: z.array(z.string().min(1)).default([]),
  cover_image_url: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]).default("draft"),
  published_at: z.string().optional().nullable(),
});

export type BlogEditorValues = z.infer<typeof editorSchema>;

type BlogEditorProps = {
  initialData?: BlogEditorValues;
  supabaseClient: any;
  entryType?: "blog" | "case_study" | "manual";
  entityLabel?: string;
  newTitle?: string;
  editTitle?: string;
  redirectPath?: string;
  storageFolder?: string;
};

const RANDOM_SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function generateRandomSlug(length: number = 8): string {
  let result = "";
  const charsLength = RANDOM_SLUG_CHARS.length;
  for (let i = 0; i < length; i++) {
    result += RANDOM_SLUG_CHARS[Math.floor(Math.random() * charsLength)];
  }
  return result;
}

type BlockType =
  | "paragraph"
  | "heading2"
  | "heading3"
  | "quote"
  | "bulletedList"
  | "numberedList"
  | "image"
  | "embed"
  | "divider"
  | "table"
  | "toc";

type BaseBlock = {
  id: string;
  type: BlockType;
};

type ParagraphBlock = BaseBlock & {
  type: "paragraph";
  text: string;
};

type Heading2Block = BaseBlock & {
  type: "heading2";
  text: string;
};

type Heading3Block = BaseBlock & {
  type: "heading3";
  text: string;
};

type QuoteBlock = BaseBlock & {
  type: "quote";
  text: string;
};

type BulletedListBlock = BaseBlock & {
  type: "bulletedList";
  items: string[];
};

type NumberedListBlock = BaseBlock & {
  type: "numberedList";
  items: string[];
};

type ImageBlock = BaseBlock & {
  type: "image";
  url: string;
  alt: string;
  caption?: string;
};

type EmbedBlock = BaseBlock & {
  type: "embed";
  code: string;
};

type DividerBlock = BaseBlock & {
  type: "divider";
};

type TableBlock = BaseBlock & {
  type: "table";
  headers: string[];
  rows: string[][];
};

type TocBlock = BaseBlock & {
  type: "toc";
};

type Block =
  | ParagraphBlock
  | Heading2Block
  | Heading3Block
  | QuoteBlock
  | BulletedListBlock
  | NumberedListBlock
  | ImageBlock
  | EmbedBlock
  | DividerBlock
  | TableBlock
  | TocBlock;

function createBlock(type: BlockType): Block {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  switch (type) {
    case "heading2":
      return { id, type: "heading2", text: "見出し 2" };
    case "heading3":
      return { id, type: "heading3", text: "見出し 3" };
    case "quote":
      return { id, type: "quote", text: "" };
    case "bulletedList":
      return { id, type: "bulletedList", items: [""] };
    case "numberedList":
      return { id, type: "numberedList", items: [""] };
    case "image":
      return { id, type: "image", url: "", alt: "", caption: "" };
    case "embed":
      return { id, type: "embed", code: "" };
    case "divider":
      return { id, type: "divider" };
    case "table":
      return { id, type: "table", headers: [""], rows: [[""]] };
    case "toc":
      return { id, type: "toc" };
    case "paragraph":
    default:
      return { id, type: "paragraph", text: "" };
  }
}

function isBlockEmpty(block: Block): boolean {
  switch (block.type) {
    case "paragraph":
    case "heading2":
    case "heading3":
    case "quote":
      return !block.text.trim();
    case "bulletedList":
    case "numberedList":
      return block.items.every((item) => !item.trim());
    case "image":
      return !block.url.trim();
    case "embed":
      return !block.code.trim();
    case "divider":
      return false;
    case "table": {
      const headersEmpty = block.headers.every((h) => !h.trim());
      const rowsEmpty = block.rows.every((row) => row.every((cell) => !cell.trim()));
      return headersEmpty && rowsEmpty;
    }
    case "toc":
      return false;
    default:
      return false;
  }
}

function blocksToMarkdown(blocks: Block[]): string {
  const nonEmptyBlocks = blocks.filter((block) => !isBlockEmpty(block));

  const lines: string[] = [];

  for (const block of nonEmptyBlocks) {
    switch (block.type) {
      case "paragraph": {
        lines.push(block.text.trim());
        break;
      }
      case "heading2": {
        lines.push(`## ${block.text.trim()}`);
        break;
      }
      case "heading3": {
        lines.push(`### ${block.text.trim()}`);
        break;
      }
      case "quote": {
        const qLines = block.text.split("\n").map((l) => l.trim());
        qLines.forEach((l) => {
          lines.push(l ? `> ${l}` : ">");
        });
        break;
      }
      case "bulletedList": {
        block.items
          .map((i) => i.trim())
          .filter((i) => i.length > 0)
          .forEach((i) => lines.push(`- ${i}`));
        break;
      }
      case "numberedList": {
        block.items
          .map((i) => i.trim())
          .filter((i) => i.length > 0)
          .forEach((i, idx) => lines.push(`${idx + 1}. ${i}`));
        break;
      }
      case "image": {
        const url = block.url.trim();
        if (!url) break;
        const alt = block.alt.trim();
        lines.push(`![${alt}](${url})`);
        if (block.caption && block.caption.trim()) {
          lines.push("");
          lines.push(`_${block.caption.trim()}_`);
        }
        break;
      }
      case "embed": {
        if (!block.code.trim()) break;
        lines.push("```");
        lines.push(block.code.trim());
        lines.push("```");
        break;
      }
      case "divider": {
        lines.push("---");
        break;
      }
      case "table": {
        const headers = block.headers.map((h) => h.trim());
        const rows = block.rows.map((row) => row.map((cell) => cell.trim()));
        const hasContent =
          headers.some((h) => h.length > 0) || rows.some((row) => row.some((cell) => cell.length > 0));
        if (!hasContent) break;

        const colCount = Math.max(headers.length || 1, ...rows.map((row) => row.length || 1));
        const normalizeRow = (row: string[]) => {
          const next = [...row];
          while (next.length < colCount) next.push("");
          return next;
        };

        const headerRow = normalizeRow(headers);
        lines.push(`| ${headerRow.join(" | ")} |`);
        lines.push(`| ${Array(colCount).fill("---").join(" | ")} |`);
        rows.forEach((row) => {
          const normalized = normalizeRow(row);
          lines.push(`| ${normalized.join(" | ")} |`);
        });
        break;
      }
      case "toc": {
        lines.push("[[toc]]");
        break;
      }
      default:
        break;
    }

    lines.push("");
  }

  return lines.join("\n").trim();
}

function initializeBlocksFromContent(initialContent: string | null | undefined): Block[] {
  const source = (initialContent ?? "").trim();
  if (!source) {
    return [];
  }

  const lines = source.split(/\r?\n/);
  const blocks: Block[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    const base = createBlock("paragraph") as ParagraphBlock;
    blocks.push({
      ...base,
      text: paragraphLines.join("\n").trim(),
    });
    paragraphLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (/^##\s+/.test(trimmed)) {
      flushParagraph();
      const base = createBlock("heading2") as Heading2Block;
      blocks.push({
        ...base,
        text: trimmed.replace(/^##\s+/, "").trim(),
      });
      continue;
    }

    if (/^###\s+/.test(trimmed)) {
      flushParagraph();
      const base = createBlock("heading3") as Heading3Block;
      blocks.push({
        ...base,
        text: trimmed.replace(/^###\s+/, "").trim(),
      });
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();

  return blocks;
}

export function BlogEditor({
  initialData,
  supabaseClient,
  entryType,
  entityLabel,
  newTitle,
  editTitle,
  redirectPath,
  storageFolder,
}: BlogEditorProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [editorMode, setEditorMode] = useState<"blocks" | "markdown">("blocks");
  const [markdownText, setMarkdownText] = useState(initialData?.content ?? "");
  const [blocks, setBlocks] = useState<Block[]>(() => initializeBlocksFromContent(initialData?.content));

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");

  const isNew = !initialData?.id;
  const [initialSlug] = useState(() => initialData?.slug ?? generateRandomSlug(8));
  const [initialPublishedAt] = useState(() => initialData?.published_at ?? new Date().toISOString());

  const resolvedType: "blog" | "case_study" | "manual" = entryType ?? "blog";
  const resolvedEntityLabel = entityLabel ?? "ブログ記事";
  const resolvedNewTitle = newTitle ?? "新規記事を作成";
  const resolvedEditTitle = editTitle ?? "記事を編集";
  const resolvedRedirectPath = redirectPath ?? "/admin/cms/blog";
  const resolvedStorageFolder = storageFolder ?? "blog";

  const form = useForm<BlogEditorValues>({
    resolver: zodResolver(editorSchema),
    defaultValues: {
      id: initialData?.id,
      previousSlug: initialData?.slug,
      title: initialData?.title ?? "",
      slug: initialSlug,
      content: initialData?.content ?? "",
      excerpt: initialData?.excerpt ?? "",
      category: initialData?.category ?? "",
      categories:
        (initialData as any)?.categories && Array.isArray((initialData as any).categories)
          ? ((initialData as any).categories as string[])
          : initialData?.category
          ? [initialData.category]
          : [],
      cover_image_url: initialData?.cover_image_url ?? "",
      status: initialData?.status ?? "draft",
      published_at: initialData?.published_at ?? initialPublishedAt,
    },
  });

  const status = form.watch("status");
  const selectedCategories = form.watch("categories") ?? [];
  const coverImageUrl = form.watch("cover_image_url") ?? "";

  useEffect(() => {
    if (!isNew) {
      form.setValue("previousSlug", initialData?.slug);
    }
  }, [form, initialData?.slug, isNew]);

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabaseClient
        .from("cms_entries")
        .select("tags")
        .eq("type", resolvedType);

      if (error) {
        console.error("[BlogEditor] タグ一覧の取得に失敗しました", error);
        return;
      }

      const uniqueSet = new Set<string>();

      (data ?? []).forEach((row: { tags: string[] | null }) => {
        if (Array.isArray(row.tags)) {
          row.tags.forEach((tag) => {
            if (typeof tag === "string" && tag.length > 0) {
              uniqueSet.add(tag);
            }
          });
        }
      });

      setCategoryOptions(Array.from(uniqueSet));
    };

    loadCategories();
  }, [supabaseClient, resolvedType]);

  const handleCoverUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${resolvedStorageFolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from("public-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("[BlogEditor] Supabase storage upload error", uploadError, uploadData);
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabaseClient.storage.from("public-assets").getPublicUrl(filePath);

      form.setValue("cover_image_url", publicUrl, { shouldDirty: true });

      toast({ title: "カバー画像をアップロードしました", description: "プレビューで表示を確認できます。" });
    } catch (error) {
      console.error("[BlogEditor] カバー画像のアップロードに失敗しました", error);
      toast({
        title: "アップロードに失敗しました",
        description: "画像サイズやネットワーク環境を確認して、もう一度お試しください。",
      });
    } finally {
      setUploadingCover(false);
    }
  };

  const addCategory = (raw: string) => {
    const value = raw.trim();
    if (!value) return;

    const current: string[] = form.getValues("categories") ?? [];
    if (current.includes(value)) return;

    const next = [...current, value];
    form.setValue("categories", next, { shouldDirty: true });

    if (!form.getValues("category")) {
      form.setValue("category", value, { shouldDirty: true });
    }
  };

  const removeCategory = (target: string) => {
    const current: string[] = form.getValues("categories") ?? [];
    const next = current.filter((c) => c !== target);
    form.setValue("categories", next, { shouldDirty: true });

    const currentPrimary = form.getValues("category");
    if (currentPrimary === target) {
      form.setValue("category", next[0] ?? "", { shouldDirty: true });
    }
  };

  const insertBlockAt = (index: number, type: BlockType) => {
    const newBlock = createBlock(type);
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(index, 0, newBlock);
      return next;
    });
  };

  const updateBlock = (id: string, updater: (block: Block) => Block) => {
    setBlocks((prev) => prev.map((block) => (block.id === id ? updater(block) : block)));
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== id));
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    setBlocks((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleSubmitToSupabase = async (values: BlogEditorValues) => {
    console.log("[BlogEditor] 保存処理開始", values);
    setIsSaving(true);

    try {
      const normalizedCategories = (values.categories ?? [])
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const payload = {
        type: resolvedType,
        title: values.title,
        slug: values.slug,
        body: values.content,
        excerpt: values.excerpt || null,
        tags: normalizedCategories.length ? normalizedCategories : null,
        cover_image_url: values.cover_image_url || null,
        status: values.status,
        published_at: values.published_at ? new Date(values.published_at).toISOString() : null,
      };

      console.log("[BlogEditor] Supabase upsert 送信前", payload);

      let nextSlug = values.slug;

      if (values.id) {
        const { data, error } = await supabaseClient
          .from("cms_entries")
          .update(payload)
          .eq("id", values.id)
          .eq("type", resolvedType)
          .select("id, slug")
          .single();

        console.log("[BlogEditor] update result", { data, error });

        if (error) {
          throw new Error(error.message ?? "コンテンツの更新に失敗しました");
        }

        nextSlug = data?.slug ?? values.slug;
      } else {
        const { data, error } = await supabaseClient
          .from("cms_entries")
          .insert(payload)
          .select("id, slug")
          .single();

        console.log("[BlogEditor] insert result", { data, error });

        if (error) {
          throw new Error(error.message ?? "コンテンツの作成に失敗しました");
        }

        nextSlug = data?.slug ?? nextSlug;
      }

      toast({ title: "保存しました", description: "コンテンツの変更が反映されました。" });

      if (nextSlug && nextSlug !== values.previousSlug) {
        console.log("[BlogEditor] slug updated", { nextSlug });
      }

      router.push(resolvedRedirectPath);
    } catch (error) {
      console.error("[BlogEditor] 保存処理でエラー", error);
      toast({
        title: "保存に失敗しました",
        description: error instanceof Error ? error.message : "入力内容を確認し、もう一度お試しください。",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;

    setIsDeleting(true);
    try {
      console.log("[BlogEditor] 削除処理開始", initialData.id);
      const { error } = await supabaseClient
        .from("cms_entries")
        .delete()
        .eq("id", initialData.id)
        .eq("type", resolvedType);

      console.log("[BlogEditor] 削除結果", { error });

      if (error) {
        throw new Error(error.message ?? "コンテンツの削除に失敗しました");
      }

      toast({ title: "削除しました", description: "コンテンツを削除しました。" });
      router.push(resolvedRedirectPath);
    } catch (error) {
      console.error(error);
      toast({
        title: "削除に失敗しました",
        description: error instanceof Error ? error.message : "もう一度お試しください。",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const publishedLabel = useMemo(() => (status === "published" ? "公開中" : "下書き"), [status]);

  const handleFormSubmit = (values: BlogEditorValues) => {
    const markdown = editorMode === "markdown" ? markdownText : blocksToMarkdown(blocks);

    if (!markdown.trim()) {
      toast({ title: "本文が空です", description: "本文を入力してください。" });
      return;
    }

    const nextValues: BlogEditorValues = {
      ...values,
      content: markdown,
    };

    return handleSubmitToSupabase(nextValues);
  };

  return (
    <form className="space-y-8 p-8" onSubmit={form.handleSubmit(handleFormSubmit)}>
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{resolvedEntityLabel}</p>
          <h1 className="text-3xl font-semibold text-slate-900">
            {isNew ? resolvedNewTitle : resolvedEditTitle}
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant={status === "published" ? "success" : "neutral"}>{publishedLabel}</Badge>
            <span className="text-xs text-slate-500">ステータスを切り替えると公開状態が変わります。</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-4 py-2">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">公開</span>
            <Switch
              checked={status === "published"}
              onCheckedChange={(checked) => form.setValue("status", checked ? "published" : "draft")}
            />
          </div>
          {!isNew && (
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="border-red-400/40 text-red-300">
                  <Trash2 className="mr-2 h-4 w-4" /> 削除
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-950/95">
                <DialogHeader>
                  <DialogTitle>記事を削除しますか？</DialogTitle>
                  <DialogDescription>
                    この操作は取り消せません。公開中の記事はサイトからも削除されます。
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3 pt-4">
                  <DialogClose asChild>
                    <Button variant="ghost">キャンセル</Button>
                  </DialogClose>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-500"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    削除する
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button type="submit" className="bg-primary text-white" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            保存する
          </Button>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.8fr_1fr]">
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-slate-700">
              タイトル
            </Label>
            <Input id="title" placeholder="タイトル" {...form.register("title")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="excerpt" className="text-slate-700">
              リード文（任意）
            </Label>
            <Textarea id="excerpt" rows={3} placeholder="短い説明文" {...form.register("excerpt")} />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700">本文</Label>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                {editorMode === "blocks" ? "ブロックエディタ" : "Markdown"}
              </span>
              <Button
                type="button"
                variant={editorMode === "blocks" ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => {
                  if (editorMode !== "blocks") {
                    setBlocks(initializeBlocksFromContent(markdownText));
                    setEditorMode("blocks");
                  }
                }}
              >
                ブロック
              </Button>
              <Button
                type="button"
                variant={editorMode === "markdown" ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => {
                  if (editorMode !== "markdown") {
                    setMarkdownText(blocksToMarkdown(blocks));
                    setEditorMode("markdown");
                  }
                }}
              >
                Markdown
              </Button>
            </div>

            {editorMode === "markdown" ? (
              <Textarea
                id="content"
                rows={18}
                placeholder="Markdown 形式で本文を入力"
                value={markdownText}
                onChange={(event) => {
                  const value = event.target.value;
                  setMarkdownText(value);
                }}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">本文ブロック</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-full px-3 text-[11px]"
                      >
                        ＋ ブロックを追加
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 text-xs">
                      <DropdownMenuItem onSelect={() => insertBlockAt(blocks.length, "image")}>
                        画像
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => insertBlockAt(blocks.length, "embed")}>
                        埋め込みコード
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => insertBlockAt(blocks.length, "table")}>
                        テーブル
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => insertBlockAt(blocks.length, "paragraph")}>
                        テキスト
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => insertBlockAt(blocks.length, "heading2")}>
                        H2 見出し
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => insertBlockAt(blocks.length, "heading3")}>
                        H3 見出し
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => insertBlockAt(blocks.length, "quote")}>
                        引用
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => insertBlockAt(blocks.length, "bulletedList")}>
                        箇条書きリスト
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => insertBlockAt(blocks.length, "numberedList")}>
                        番号付きリスト
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => insertBlockAt(blocks.length, "divider")}>
                        区切り線
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => insertBlockAt(blocks.length, "toc")}>
                        目次
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2">
                  {blocks.length === 0 && (
                    <p className="text-xs text-slate-400">
                      「＋ ブロックを追加」から本文ブロックを追加してください。
                    </p>
                  )}
                  {blocks.map((block, index) => (
                    <div
                      key={block.id}
                      className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          {block.type === "paragraph" && "テキスト"}
                          {block.type === "heading2" && "H2 見出し"}
                          {block.type === "heading3" && "H3 見出し"}
                          {block.type === "quote" && "引用"}
                          {block.type === "bulletedList" && "箇条書きリスト"}
                          {block.type === "numberedList" && "番号付きリスト"}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            onClick={() => moveBlock(index, "up")}
                            disabled={index === 0}
                          >
                            <span className="text-xs">↑</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            onClick={() => moveBlock(index, "down")}
                            disabled={index === blocks.length - 1}
                          >
                            <span className="text-xs">↓</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] text-slate-500 hover:text-red-500"
                            onClick={() => removeBlock(block.id)}
                          >
                            削除
                          </Button>
                        </div>
                      </div>

                      {block.type === "paragraph" && (
                        <Textarea
                          rows={3}
                          placeholder="本文を入力"
                          value={block.text}
                          onChange={(event) =>
                            updateBlock(block.id, (b) => ({
                              ...b,
                              text: event.target.value,
                            }))
                          }
                        />
                      )}

                      {block.type === "heading2" && (
                        <Input
                          placeholder="見出し 2"
                          value={block.text}
                          onChange={(event) =>
                            updateBlock(block.id, (b) => ({
                              ...b,
                              text: event.target.value,
                            }))
                          }
                        />
                      )}

                      {block.type === "heading3" && (
                        <Input
                          placeholder="見出し 3"
                          value={block.text}
                          onChange={(event) =>
                            updateBlock(block.id, (b) => ({
                              ...b,
                              text: event.target.value,
                            }))
                          }
                        />
                      )}

                      {block.type === "quote" && (
                        <Textarea
                          rows={3}
                          placeholder="引用文を入力"
                          value={block.text}
                          onChange={(event) =>
                            updateBlock(block.id, (b) => ({
                              ...b,
                              text: event.target.value,
                            }))
                          }
                        />
                      )}

                      {block.type === "bulletedList" && (
                        <div className="space-y-2">
                          {block.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex items-center gap-2">
                              <span className="text-sm text-slate-400">・</span>
                              <Input
                                placeholder="項目を入力"
                                value={item}
                                onChange={(event) =>
                                  updateBlock(block.id, (b) => {
                                    const list = b as BulletedListBlock;
                                    return {
                                      ...list,
                                      items: list.items.map((it, idx) =>
                                        idx === itemIndex ? event.target.value : it,
                                      ),
                                    };
                                  })
                                }
                              />
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] text-slate-700"
                            onClick={() =>
                              updateBlock(block.id, (b) => {
                                const list = b as BulletedListBlock;
                                return {
                                  ...list,
                                  items: [...list.items, ""],
                                };
                              })
                            }
                          >
                            項目を追加
                          </Button>
                        </div>
                      )}

                      {block.type === "numberedList" && (
                        <div className="space-y-2">
                          {block.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex items-center gap-2">
                              <span className="text-sm text-slate-400">{itemIndex + 1}.</span>
                              <Input
                                placeholder="項目を入力"
                                value={item}
                                onChange={(event) =>
                                  updateBlock(block.id, (b) => {
                                    const list = b as NumberedListBlock;
                                    return {
                                      ...list,
                                      items: list.items.map((it, idx) =>
                                        idx === itemIndex ? event.target.value : it,
                                      ),
                                    };
                                  })
                                }
                              />
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] text-slate-700"
                            onClick={() =>
                              updateBlock(block.id, (b) => {
                                const list = b as NumberedListBlock;
                                return {
                                  ...list,
                                  items: [...list.items, ""],
                                };
                              })
                            }
                          >
                            項目を追加
                          </Button>
                        </div>
                      )}

                      {block.type === "image" && (
                        <div className="space-y-3">
                          <Input
                            placeholder="画像のURL"
                            value={block.url}
                            onChange={(event) =>
                              updateBlock(block.id, (b) => ({
                                ...(b as ImageBlock),
                                url: event.target.value,
                              }))
                            }
                          />
                          <Input
                            placeholder="代替テキスト（alt）"
                            value={block.alt}
                            onChange={(event) =>
                              updateBlock(block.id, (b) => ({
                                ...(b as ImageBlock),
                                alt: event.target.value,
                              }))
                            }
                          />
                          <Input
                            placeholder="キャプション（任意）"
                            value={block.caption ?? ""}
                            onChange={(event) =>
                              updateBlock(block.id, (b) => ({
                                ...(b as ImageBlock),
                                caption: event.target.value,
                              }))
                            }
                          />
                        </div>
                      )}

                      {block.type === "embed" && (
                        <Textarea
                          rows={3}
                          placeholder="埋め込みコードを入力"
                          value={block.code}
                          onChange={(event) =>
                            updateBlock(block.id, (b) => ({
                              ...(b as EmbedBlock),
                              code: event.target.value,
                            }))
                          }
                        />
                      )}

                      {block.type === "divider" && (
                        <div className="py-2">
                          <div className="border-t border-slate-300" />
                        </div>
                      )}

                      {block.type === "table" && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <p className="text-[11px] text-slate-500">ヘッダー</p>
                            <div className="flex flex-wrap gap-2">
                              {block.headers.map((header, headerIndex) => (
                                <Input
                                  key={headerIndex}
                                  className="w-32"
                                  placeholder={`列 ${headerIndex + 1}`}
                                  value={header}
                                  onChange={(event) =>
                                    updateBlock(block.id, (b) => {
                                      const table = b as TableBlock;
                                      const nextHeaders = [...table.headers];
                                      nextHeaders[headerIndex] = event.target.value;
                                      return {
                                        ...table,
                                        headers: nextHeaders,
                                      };
                                    })
                                  }
                                />
                              ))}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px] text-slate-700"
                                onClick={() =>
                                  updateBlock(block.id, (b) => {
                                    const table = b as TableBlock;
                                    const nextHeaders = [...table.headers, ""];
                                    const nextRows = table.rows.map((row) => [...row, ""]);
                                    return {
                                      ...table,
                                      headers: nextHeaders,
                                      rows: nextRows.length ? nextRows : [[""]],
                                    };
                                  })
                                }
                              >
                                列を追加
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-[11px] text-slate-500">行</p>
                            {block.rows.map((row, rowIndex) => (
                              <div key={rowIndex} className="flex flex-wrap items-center gap-2">
                                {row.map((cell, cellIndex) => (
                                  <Input
                                    key={cellIndex}
                                    className="w-32"
                                    placeholder={`行 ${rowIndex + 1}・列 ${cellIndex + 1}`}
                                    value={cell}
                                    onChange={(event) =>
                                      updateBlock(block.id, (b) => {
                                        const table = b as TableBlock;
                                        const nextRows = table.rows.map((r, rIndex) => {
                                          if (rIndex !== rowIndex) return r;
                                          const nextRow = [...r];
                                          nextRow[cellIndex] = event.target.value;
                                          return nextRow;
                                        });
                                        return {
                                          ...table,
                                          rows: nextRows,
                                        };
                                      })
                                    }
                                  />
                                ))}
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] text-slate-700"
                              onClick={() =>
                                updateBlock(block.id, (b) => {
                                  const table = b as TableBlock;
                                  const colCount = table.headers.length || (table.rows[0]?.length ?? 1);
                                  const newRow = Array(colCount).fill("");
                                  return {
                                    ...table,
                                    rows: [...table.rows, newRow],
                                  };
                                })
                              }
                            >
                              行を追加
                            </Button>
                          </div>
                        </div>
                      )}

                      {block.type === "toc" && (
                        <p className="text-xs text-slate-500">ここに目次が挿入されます。</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-slate-700">
              スラッグ
            </Label>
            <Input id="slug" placeholder="slug" {...form.register("slug")} />
            <p className="text-[11px] text-slate-500">URL に使用される英数字の文字列です。</p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="category" className="text-slate-700">
              タグ
            </Label>
            <div className="flex gap-2">
              <Input
                id="category"
                placeholder="タグ名を入力して追加"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                className="whitespace-nowrap border-slate-300 text-xs text-slate-700"
                onClick={() => {
                  addCategory(newCategory);
                  setNewCategory("");
                }}
              >
                追加
              </Button>
            </div>
            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {selectedCategories.map((cat) => (
                  <div
                    key={cat}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] text-primary"
                  >
                    <span>{cat}</span>
                    <button
                      type="button"
                      className="text-xs text-primary/80 hover:text-primary"
                      onClick={() => removeCategory(cat)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {categoryOptions.length > 0 && (
              <div className="space-y-1 pt-3">
                <p className="text-[11px] text-slate-500">既存タグから追加</p>
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-300 bg-white text-[11px] text-slate-700 hover:border-primary/40 hover:text-primary"
                      onClick={() => addCategory(option)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover_image_file" className="text-slate-700">
              サムネイル画像
            </Label>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-300 bg-white text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  const input = document.getElementById("cover_image_file") as HTMLInputElement | null;
                  input?.click();
                }}
                disabled={uploadingCover}
              >
                ファイルを選択
              </Button>
              <span className="text-xs text-slate-500">
                推奨サイズ: 1920×1080px（10MB まで・JPEG / PNG のみ）
              </span>
            </div>
            <input
              id="cover_image_file"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
              disabled={uploadingCover}
            />
            {coverImageUrl && (
              <div className="mt-3 space-y-2">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <div className="aspect-[16/9] w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImageUrl}
                      alt="サムネイルプレビュー"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] text-slate-500 hover:text-red-500"
                  onClick={() => form.setValue("cover_image_url", "", { shouldDirty: true })}
                >
                  サムネイルを削除
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="published_at" className="text-slate-700">
              公開日時
            </Label>
            <Input
              id="published_at"
              type="datetime-local"
              defaultValue={toDateTimeLocalInputValue(initialData?.published_at ?? initialPublishedAt)}
              onChange={(event) => form.setValue("published_at", event.target.value)}
            />
          </div>
        </aside>
      </div>
    </form>
  );
}