"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, Trash2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { deleteManualPage, upsertManualPage } from "@/app/admin/cms/manuals/actions";
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
  section: z.string().min(1, "セクションは必須です"),
  body_markdown: z.string().min(1, "本文は必須です"),
  order: z.coerce.number().default(0),
  status: z.enum(["draft", "published"]).default("draft"),
  published_at: z.string().optional().nullable()
});

export type ManualEditorValues = z.infer<typeof editorSchema>;

type ManualEditorProps = {
  initialData?: ManualEditorValues;
};

export function ManualEditor({ initialData }: ManualEditorProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [isPending, startTransition] = useTransition();

  const form = useForm<ManualEditorValues>({
    resolver: zodResolver(editorSchema),
    defaultValues: {
      id: initialData?.id,
      previousSlug: initialData?.slug,
      title: initialData?.title ?? "",
      slug: initialData?.slug ?? "",
      section: initialData?.section ?? "general",
      body_markdown: initialData?.body_markdown ?? "",
      order: initialData?.order ?? 0,
      status: initialData?.status ?? "draft",
      published_at: initialData?.published_at ?? ""
    }
  });

  const status = form.watch("status");
  const markdown = form.watch("body_markdown");
  const isNew = !initialData?.id;

  useEffect(() => {
    if (!isNew) {
      form.setValue("previousSlug", initialData?.slug);
    }
  }, [form, initialData?.slug, isNew]);

  const handleSubmit = (values: ManualEditorValues) => {
    startTransition(async () => {
      try {
        const result = await upsertManualPage(values);
        toast({ title: "保存しました", description: "マニュアルを更新しました。" });
        if (result.id && isNew) {
          router.replace(`/admin/cms/manuals/${result.id}`);
        }
      } catch (error) {
        console.error(error);
        toast({ title: "保存に失敗しました", description: "入力内容を確認してください。" });
      }
    });
  };

  const handleDelete = () => {
    if (!initialData?.id) return;
    startTransition(async () => {
      try {
        await deleteManualPage(initialData.id!, initialData.slug);
        toast({ title: "削除しました", description: "マニュアルを削除しました。" });
      } catch (error) {
        console.error(error);
        toast({ title: "削除に失敗しました", description: "もう一度お試しください。" });
      }
    });
  };

  return (
    <form className="space-y-8" onSubmit={form.handleSubmit((values) => handleSubmit(values))}>
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.45)] md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">マニュアル</p>
          <h1 className="text-3xl font-semibold text-white">{isNew ? "新規マニュアルを作成" : "マニュアルを編集"}</h1>
          <div className="flex items-center gap-2">
            <Badge variant={status === "published" ? "success" : "neutral"}>
              {status === "published" ? "公開中" : "下書き"}
            </Badge>
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
                  <DialogTitle>マニュアルを削除しますか？</DialogTitle>
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
                    disabled={isPending}
                    className="bg-red-600 hover:bg-red-500"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} 削除する
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button type="submit" className="bg-primary text-white" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
              <TabsContent value="preview" className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
                {markdown ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert max-w-none">
                    {markdown}
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
            <Input id="slug" placeholder="manual-overview" {...form.register("slug")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="section" className="text-slate-300">
              セクションキー
            </Label>
            <Input id="section" placeholder="getting-started" {...form.register("section")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="order" className="text-slate-300">
              並び順
            </Label>
            <Input
              id="order"
              type="number"
              step={1}
              {...form.register("order", { valueAsNumber: true })}
            />
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
