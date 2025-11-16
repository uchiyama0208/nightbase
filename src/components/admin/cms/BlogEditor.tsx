"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, Trash2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { toDateTimeLocalInputValue } from "@/lib/utils";

const editorSchema = z.object({
  id: z.string().optional(),
  previousSlug: z.string().optional(),
  title: z.string().min(1, "タイトルは必須です"),
  slug: z.string().min(1, "スラッグは必須です"),
  content: z.string().min(1, "本文は必須です"),
  excerpt: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  cover_image_url: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]).default("draft"),
  published_at: z.string().optional().nullable()
});

export type BlogEditorValues = z.infer<typeof editorSchema>;

type BlogEditorProps = {
  initialData?: BlogEditorValues;
  supabaseClient: any;
};

export function BlogEditor({ initialData, supabaseClient }: BlogEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<BlogEditorValues>({
    resolver: zodResolver(editorSchema),
    defaultValues: {
      id: initialData?.id,
      previousSlug: initialData?.slug,
      title: initialData?.title ?? "",
      slug: initialData?.slug ?? "",
      content: initialData?.content ?? "",
      excerpt: initialData?.excerpt ?? "",
      category: initialData?.category ?? "",
      cover_image_url: initialData?.cover_image_url ?? "",
      status: initialData?.status ?? "draft",
      published_at: initialData?.published_at ?? ""
    }
  });

  const status = form.watch("status");
  const content = form.watch("content");
  const isNew = !initialData?.id;

  useEffect(() => {
    if (!isNew) {
      form.setValue("previousSlug", initialData?.slug);
    }
  }, [form, initialData?.slug, isNew]);

  const handleSubmit = async (values: BlogEditorValues) => {
    console.log("[BlogEditor] 保存処理開始", values);
    setIsSaving(true);

    try {
      const payload = {
        title: values.title,
        slug: values.slug,
        content: values.content,
        excerpt: values.excerpt || null,
        category: values.category || null,
        cover_image_url: values.cover_image_url || null,
        status: values.status,
        published_at: values.published_at ? new Date(values.published_at).toISOString() : null
      };

      console.log("[BlogEditor] Supabase upsert 送信前", payload);

      let nextId = values.id;
      let nextSlug = values.slug;

      if (values.id) {
        const { data, error } = await supabaseClient
          .from("blog_posts")
          .update(payload)
          .eq("id", values.id)
          .select("id, slug")
          .single();

        console.log("[BlogEditor] update result", { data, error });

        if (error) {
          throw new Error(error.message ?? "ブログ記事の更新に失敗しました");
        }

        nextId = data?.id ?? values.id;
        nextSlug = data?.slug ?? values.slug;
      } else {
        const { data, error } = await supabaseClient
          .from("blog_posts")
          .insert(payload)
          .select("id, slug")
          .single();

        console.log("[BlogEditor] insert result", { data, error });

        if (error) {
          throw new Error(error.message ?? "ブログ記事の作成に失敗しました");
        }

        nextId = data?.id ?? nextId;
        nextSlug = data?.slug ?? nextSlug;
      }

      toast({ title: "保存しました", description: "ブログ記事の変更が反映されました。" });

      if (!values.id && nextId) {
        router.replace(`/admin/cms/blog/${nextId}`);
        return;
      }

      if (nextSlug && nextSlug !== values.previousSlug) {
        console.log("[BlogEditor] slug updated", { nextSlug });
      }

      router.refresh();
    } catch (error) {
      console.error("[BlogEditor] 保存処理でエラー", error);
      toast({
        title: "保存に失敗しました",
        description: error instanceof Error ? error.message : "入力内容を確認し、もう一度お試しください。"
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
      const { error } = await supabaseClient.from("blog_posts").delete().eq("id", initialData.id);
      console.log("[BlogEditor] 削除結果", { error });

      if (error) {
        throw new Error(error.message ?? "ブログ記事の削除に失敗しました");
      }

      toast({ title: "削除しました", description: "ブログ記事を削除しました。" });
      router.push("/admin/cms/blog");
    } catch (error) {
      console.error(error);
      toast({ title: "削除に失敗しました", description: error instanceof Error ? error.message : "もう一度お試しください。" });
    } finally {
      setIsDeleting(false);
    }
  };

  const publishedLabel = useMemo(() => (status === "published" ? "公開中" : "下書き"), [status]);

  return (
    <form className="space-y-8" onSubmit={form.handleSubmit((values) => handleSubmit(values))}>
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.45)] md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">ブログ記事</p>
          <h1 className="text-3xl font-semibold text-white">{isNew ? "新規記事を作成" : "記事を編集"}</h1>
          <div className="flex items-center gap-2">
            <Badge variant={status === "published" ? "success" : "neutral"}>{publishedLabel}</Badge>
            <span className="text-xs text-slate-400">ステータスを切り替えると公開状態が変わります。</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-4 py-2">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">公開</span>
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
                  <DialogDescription>この操作は取り消せません。公開中の記事はサイトからも削除されます。</DialogDescription>
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
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} 削除する
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
        <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-slate-300">
              タイトル
            </Label>
            <Input id="title" placeholder="タイトル" {...form.register("title")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="excerpt" className="text-slate-300">
              リード文（任意）
            </Label>
            <Textarea id="excerpt" rows={3} placeholder="短い説明文" {...form.register("excerpt")} />
          </div>
          <div className="space-y-4">
            <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
              <TabsList>
                <TabsTrigger value="edit">エディタ</TabsTrigger>
                <TabsTrigger value="preview">プレビュー</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="space-y-2">
                <Textarea rows={18} placeholder="本文を Markdown 形式で入力" {...form.register("content")} />
              </TabsContent>
              <TabsContent value="preview" className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
                {content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert max-w-none">
                    {content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-sm text-slate-400">プレビューする本文がありません。</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>

        <aside className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-slate-300">
              スラッグ
            </Label>
            <Input id="slug" placeholder="first-post" {...form.register("slug")} />
            <p className="text-xs text-slate-500">URL に使用される文字列です。半角英数字とハイフンを推奨します。</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category" className="text-slate-300">
              カテゴリ
            </Label>
            <Input id="category" placeholder="お知らせ" {...form.register("category")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover_image_url" className="text-slate-300">
              カバー画像 URL
            </Label>
            <Input id="cover_image_url" placeholder="https://" {...form.register("cover_image_url")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="published_at" className="text-slate-300">
              公開日時
            </Label>
            <Input
              id="published_at"
              type="datetime-local"
              defaultValue={toDateTimeLocalInputValue(initialData?.published_at)}
              onChange={(event) => form.setValue("published_at", event.target.value)}
            />
          </div>
        </aside>
      </div>
    </form>
  );
}
