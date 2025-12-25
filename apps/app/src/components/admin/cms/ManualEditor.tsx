"use client";

import { useEffect, useState } from "react";
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
import type { Database, Json } from "@/types/supabase";

const editorSchema = z.object({
  id: z.string().optional(),
  previousSlug: z.string().optional(),
  title: z.string().min(1, "タイトルは必須です"),
  slug: z.string().min(1, "スラッグは必須です"),
  section: z.string().min(1, "セクションは必須です"),
  body_markdown: z.string().min(1, "本文は必須です"),
  order: z.coerce.number().default(0),
  status: z.enum(["draft", "published"]).default("draft"),
  published_at: z.string().optional().nullable()
});

export type ManualEditorValues = z.infer<typeof editorSchema>;

type ManualEditorProps = {
  initialData?: ManualEditorValues;
  supabaseClient: any;
};

type CmsEntryInsert = Database["public"]["Tables"]["cms_entries"]["Insert"];

export function ManualEditor({ initialData, supabaseClient }: ManualEditorProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isNew = !initialData?.id;
  const [initialSlug] = useState(() => initialData?.slug ?? Math.random().toString(36).slice(2, 10));
  const [initialPublishedAt] = useState(
    () => initialData?.published_at ?? new Date().toISOString()
  );

  const form = useForm<ManualEditorValues>({
    resolver: zodResolver(editorSchema),
    defaultValues: {
      id: initialData?.id,
      previousSlug: initialData?.slug,
      title: initialData?.title ?? "",
      slug: initialSlug,
      section: initialData?.section ?? "general",
      body_markdown: initialData?.body_markdown ?? "",
      order: initialData?.order ?? 0,
      status: initialData?.status ?? "draft",
      published_at: initialData?.published_at ?? initialPublishedAt
    }
  });

  const status = form.watch("status");
  const markdown = form.watch("body_markdown");

  useEffect(() => {
    if (!isNew) {
      form.setValue("previousSlug", initialData?.slug);
    }
  }, [form, initialData?.slug, isNew]);

  const handleSubmit = async (values: ManualEditorValues) => {
    setIsSaving(true);

    try {
      const metadata: Json = {
        section: values.section,
        order: values.order ?? 0,
      };

      const payload: CmsEntryInsert = {
        type: "manual",
        title: values.title,
        slug: values.slug,
        body: values.body_markdown,
        excerpt: null,
        tags: null,
        cover_image_url: null,
        status: values.status,
        published_at: values.published_at ? new Date(values.published_at).toISOString() : null,
        metadata,
      };

      let nextSlug = values.slug;

      if (values.id) {
        const { data, error } = await supabaseClient
          .from("cms_entries")
          .update(payload)
          .eq("id", values.id)
          .eq("type", "manual")
          .select("id, slug")
          .single();

        if (error) {
          throw new Error(error.message ?? "マニュアルの更新に失敗しました");
        }

        nextSlug = data?.slug ?? values.slug;
      } else {
        const { data, error } = await supabaseClient
          .from("cms_entries")
          .insert(payload)
          .select("id, slug")
          .single();

        if (error) {
          throw new Error(error.message ?? "マニュアルの作成に失敗しました");
        }

        nextSlug = data?.slug ?? nextSlug;
      }

      toast({ title: "保存しました", description: "マニュアルを更新しました。" });

      if (!values.id) {
        router.push("/admin/cms/manuals");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("[ManualEditor] 保存処理でエラー", error);
      toast({
        title: "保存に失敗しました",
        description: error instanceof Error ? error.message : "入力内容を確認してください。"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;

    setIsDeleting(true);
    try {
      const { error } = await supabaseClient
        .from("cms_entries")
        .delete()
        .eq("id", initialData.id)
        .eq("type", "manual");

      if (error) {
        throw new Error(error.message ?? "マニュアルの削除に失敗しました");
      }

      toast({ title: "削除しました", description: "マニュアルを削除しました。" });
      router.push("/admin/cms/manuals");
    } catch (error) {
      console.error(error);
      toast({ title: "削除に失敗しました", description: error instanceof Error ? error.message : "もう一度お試しください。" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <form className="space-y-8 p-8" onSubmit={form.handleSubmit((values) => handleSubmit(values))}>
      <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500">マニュアル</p>
          <h1 className="text-3xl font-semibold text-gray-900">{isNew ? "新規マニュアルを作成" : "マニュアルを編集"}</h1>
          <div className="flex items-center gap-2">
            <Badge variant={status === "published" ? "success" : "neutral"}>{status === "published" ? "公開中" : "下書き"}</Badge>
            <span className="text-xs text-gray-500">ステータスを切り替えると公開状態が変わります。</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-gray-100 px-4 py-2">
            <span className="text-xs uppercase tracking-[0.3em] text-gray-500">公開</span>
            <Switch
              checked={status === "published"}
              onCheckedChange={(checked) => form.setValue("status", checked ? "published" : "draft")}
            />
          </div>
          {!isNew && (
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="border-red-400/40 text-red-300">
                  <Trash2 className="mr-2 h-5 w-5" /> 削除
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-950/95">
                <DialogHeader>
                  <DialogTitle className="text-gray-900 dark:text-white">マニュアルを削除しますか？</DialogTitle>
                  <DialogDescription>削除すると公開マニュアルからも削除されます。</DialogDescription>
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
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-5 w-5" />} 削除する
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
        <section className="space-y-6 rounded-3xl border border-gray-200 bg-white p-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-700">
              タイトル
            </Label>
            <Input id="title" placeholder="例: キャスト出勤管理の使い方" {...form.register("title")} />
          </div>
          <div className="space-y-4">
            <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
              <TabsList>
                <TabsTrigger value="edit">エディタ</TabsTrigger>
                <TabsTrigger value="preview">プレビュー</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="space-y-2">
                <Textarea rows={20} placeholder="Markdown で本文を入力" {...form.register("body_markdown")} />
              </TabsContent>
              <TabsContent value="preview" className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
                {markdown ? (
                  <div className="prose max-w-none text-gray-900">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {markdown}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">プレビューする本文がありません。</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
        <aside className="space-y-6 rounded-3xl border border-gray-200 bg-white p-6">
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-gray-700">
              スラッグ
            </Label>
            <Input id="slug" placeholder="manual-overview" {...form.register("slug")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="section" className="text-gray-700">
              セクションキー
            </Label>
            <Input id="section" placeholder="getting-started" {...form.register("section")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="order" className="text-gray-700">
              並び順
            </Label>
            <Input id="order" type="number" step={1} {...form.register("order", { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="published_at" className="text-gray-700">
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
