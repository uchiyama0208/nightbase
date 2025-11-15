"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { deleteCaseStudy, upsertCaseStudy } from "@/app/admin/cms/case-studies/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { toDateTimeLocalInputValue } from "@/lib/utils";
import { formatCaseStudyIndustry } from "@/lib/caseStudies";

const editorSchema = z.object({
  id: z.string().optional(),
  previousSlug: z.string().optional(),
  title: z.string().min(1, "タイトルは必須です"),
  slug: z.string().min(1, "スラッグは必須です"),
  industry: z.string().min(1, "業種は必須です"),
  description: z.string().optional().nullable(),
  results: z.string().optional().nullable(),
  cover_image_url: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]).default("draft"),
  published_at: z.string().optional().nullable()
});

export type CaseStudyEditorValues = z.infer<typeof editorSchema>;

type CaseStudyEditorProps = {
  initialData?: CaseStudyEditorValues;
};

const INDUSTRY_OPTIONS = [
  "cabaret",
  "lounge",
  "club",
  "girls-bar",
  "concept-cafe",
  "host",
  "bar"
];

export function CaseStudyEditor({ initialData }: CaseStudyEditorProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CaseStudyEditorValues>({
    resolver: zodResolver(editorSchema),
    defaultValues: {
      id: initialData?.id,
      previousSlug: initialData?.slug,
      title: initialData?.title ?? "",
      slug: initialData?.slug ?? "",
      industry: initialData?.industry ?? "cabaret",
      description: initialData?.description ?? "",
      results: initialData?.results ?? "",
      cover_image_url: initialData?.cover_image_url ?? "",
      status: initialData?.status ?? "draft",
      published_at: initialData?.published_at ?? ""
    }
  });

  const status = form.watch("status");
  const isNew = !initialData?.id;

  useEffect(() => {
    if (!isNew) {
      form.setValue("previousSlug", initialData?.slug);
    }
  }, [form, initialData?.slug, isNew]);

  const handleSubmit = (values: CaseStudyEditorValues) => {
    startTransition(async () => {
      try {
        const result = await upsertCaseStudy(values);
        toast({ title: "保存しました", description: "導入事例を更新しました。" });

        if (result.id && isNew) {
          router.replace(`/admin/cms/case-studies/${result.id}`);
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
        await deleteCaseStudy(initialData.id!, initialData.slug);
        toast({ title: "削除しました", description: "導入事例を削除しました。" });
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
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">導入事例</p>
          <h1 className="text-3xl font-semibold text-white">{isNew ? "新規事例を登録" : "事例を編集"}</h1>
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
                  <DialogTitle>導入事例を削除しますか？</DialogTitle>
                  <DialogDescription>削除すると公開ページからも非表示になります。</DialogDescription>
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
              事例タイトル
            </Label>
            <Input id="title" placeholder="例: ホストクラブA様の事例" {...form.register("title")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-300">
              導入前の課題（箇条書き可）
            </Label>
            <Textarea
              id="description"
              rows={6}
              placeholder="課題や背景を入力してください。改行すると箇条書きとして表示されます。"
              {...form.register("description")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="results" className="text-slate-300">
              導入後の変化・成果
            </Label>
            <Textarea id="results" rows={5} placeholder="効果やコメントを入力" {...form.register("results")} />
          </div>
        </section>
        <aside className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-slate-300">
              スラッグ
            </Label>
            <Input id="slug" placeholder="host-club-example" {...form.register("slug")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry" className="text-slate-300">
              業種
            </Label>
            <div className="space-y-2">
              <select
                id="industry"
                className="w-full rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
                {...form.register("industry")}
              >
                {INDUSTRY_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {formatCaseStudyIndustry(value)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover" className="text-slate-300">
              カバー画像 URL
            </Label>
            <Input id="cover" placeholder="https://" {...form.register("cover_image_url")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="published" className="text-slate-300">
              公開日時
            </Label>
            <Input
              id="published"
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
