"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { toDateTimeLocalInputValue } from "@/lib/utils";
import { encodeCaseStudyContent, formatCaseStudyIndustry } from "@/lib/caseStudies";
import type { Database, Json } from "@/types/supabase";

const editorSchema = z.object({
  id: z.string().optional(),
  previousSlug: z.string().optional(),
  title: z.string().min(1, "タイトルは必須です"),
  store_name: z.string().min(1, "店舗 / 企業名は必須です"),
  slug: z.string().min(1, "スラッグは必須です"),
  industry: z.string().min(1, "業種は必須です"),
  summary: z.string().optional().nullable(),
  problems: z.string().optional().nullable(),
  solutions: z.string().optional().nullable(),
  results: z.string().optional().nullable(),
  cover_image_url: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]).default("draft"),
  published_at: z.string().optional().nullable(),
  categories: z.array(z.string().min(1)).default([])
});

export type CaseStudyEditorValues = z.infer<typeof editorSchema>;

type CaseStudyEditorProps = {
  initialData?: CaseStudyEditorValues;
  supabaseClient: any;
};

type CmsEntryInsert = Database["public"]["Tables"]["cms_entries"]["Insert"];

const INDUSTRY_OPTIONS = ["cabaret", "lounge", "club", "girls-bar", "concept-cafe", "host", "bar"];

const RANDOM_SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function generateRandomSlug(length: number = 8): string {
  let result = "";
  const charsLength = RANDOM_SLUG_CHARS.length;

  for (let i = 0; i < length; i++) {
    result += RANDOM_SLUG_CHARS[Math.floor(Math.random() * charsLength)];
  }

  return result;
}

export function CaseStudyEditor({ initialData, supabaseClient }: CaseStudyEditorProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const isNew = !initialData?.id;
  const [initialSlug] = useState(() => initialData?.slug ?? generateRandomSlug());
  const [initialPublishedAt] = useState(() => initialData?.published_at ?? new Date().toISOString());

  const form = useForm<CaseStudyEditorValues>({
    resolver: zodResolver(editorSchema as any),
    defaultValues: {
      id: initialData?.id,
      previousSlug: initialData?.slug,
      title: initialData?.title ?? "",
      store_name: initialData?.store_name ?? "",
      slug: initialSlug,
      industry: initialData?.industry ?? "cabaret",
      summary: initialData?.summary ?? "",
      problems: initialData?.problems ?? "",
      solutions: initialData?.solutions ?? "",
      results: initialData?.results ?? "",
      cover_image_url: initialData?.cover_image_url ?? "",
      status: initialData?.status ?? "draft",
      published_at: initialData?.published_at ?? initialPublishedAt,
      categories:
        (initialData as any)?.categories && Array.isArray((initialData as any).categories)
          ? ((initialData as any).categories as string[])
          : []
    }
  });

  const status = form.watch("status");
  const selectedCategories = form.watch("categories") ?? [];

  useEffect(() => {
    if (!isNew) {
      form.setValue("previousSlug", initialData?.slug);
    }
  }, [form, initialData?.slug, isNew]);

  const handleSubmit = async (values: CaseStudyEditorValues) => {
    console.log("[CaseStudyEditor] 保存処理開始", values);
    setIsSaving(true);

    try {
      const normalizedCategories: string[] = (values.categories ?? [])
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const content = encodeCaseStudyContent({
        store_name: values.store_name?.trim() || null,
        summary: values.summary ?? null,
        problems: values.problems ?? null,
        solutions: values.solutions ?? null,
        results: values.results ?? null,
      });

      const metadata: Json = {
        ...content,
        industry: values.industry,
      };

      const payload: CmsEntryInsert = {
        type: "case_study",
        title: values.title.trim(),
        slug: values.slug.trim(),
        body: null,
        excerpt: values.summary ?? null,
        tags: normalizedCategories.length ? normalizedCategories : null,
        cover_image_url: values.cover_image_url?.trim() || null,
        status: values.status,
        published_at: values.published_at ? new Date(values.published_at).toISOString() : null,
        metadata,
      };

      console.log("[CaseStudyEditor] Supabase upsert 送信前", payload);
      console.log("[CaseStudyEditor] insert payload keys", Object.keys(payload));

      let nextSlug = values.slug;

      if (values.id) {
        const { data, error } = await supabaseClient
          .from("cms_entries")
          .update(payload)
          .eq("id", values.id)
          .eq("type", "case_study")
          .select("id, slug")
          .single();

        console.log("[CaseStudyEditor] update result", { data, error });

        if (error) {
          throw new Error(error.message ?? "導入事例の更新に失敗しました");
        }

        nextSlug = data?.slug ?? values.slug;
      } else {
        const { data, error } = await supabaseClient
          .from("cms_entries")
          .insert(payload)
          .select("id, slug")
          .single();

        console.log("[CaseStudyEditor] insert result", { data, error });

        if (error) {
          throw new Error(error.message ?? "導入事例の作成に失敗しました");
        }

        nextSlug = data?.slug ?? nextSlug;
      }

      toast({ title: "保存しました", description: "導入事例を更新しました。" });

      if (!values.id) {
        router.push("/admin/cms/case-studies");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("[CaseStudyEditor] 保存処理でエラー", error);
      toast({
        title: "保存に失敗しました",
        description: error instanceof Error ? error.message : "入力内容を確認してください。",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadingCover(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `case-studies/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabaseClient.storage.from("public-assets").upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabaseClient.storage.from("public-assets").getPublicUrl(filePath);

      form.setValue("cover_image_url", publicUrl, { shouldDirty: true });

      toast({ title: "カバー画像をアップロードしました", description: "プレビューで表示を確認できます。" });
    } catch (error) {
      console.error("[CaseStudyEditor] カバー画像のアップロードに失敗しました", error);
      toast({
        title: "アップロードに失敗しました",
        description: "画像サイズやネットワーク環境を確認して、もう一度お試しください。",
      });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;

    setIsDeleting(true);
    try {
      console.log("[CaseStudyEditor] 削除処理開始", initialData.id);
      const { error } = await supabaseClient
        .from("cms_entries")
        .delete()
        .eq("id", initialData.id)
        .eq("type", "case_study");
      console.log("[CaseStudyEditor] 削除結果", { error });

      if (error) {
        throw new Error(error.message ?? "導入事例の削除に失敗しました");
      }

      toast({ title: "削除しました", description: "導入事例を削除しました。" });
      router.push("/admin/cms/case-studies");
    } catch (error) {
      console.error(error);
      toast({ title: "削除に失敗しました", description: error instanceof Error ? error.message : "もう一度お試しください。" });
    } finally {
      setIsDeleting(false);
    }
  };

  const addCategory = (raw: string) => {
    const value = raw.trim();
    if (!value) return;

    const current: string[] = form.getValues("categories") ?? [];
    if (current.includes(value)) return;

    const next = [...current, value];
    form.setValue("categories", next, { shouldDirty: true });
  };

  const removeCategory = (target: string) => {
    const current: string[] = form.getValues("categories") ?? [];
    const next = current.filter((c) => c !== target);
    form.setValue("categories", next, { shouldDirty: true });
  };

  return (
    <form className="space-y-8 p-8" onSubmit={form.handleSubmit((values) => handleSubmit(values))}>
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">導入事例</p>
          <h1 className="text-3xl font-semibold text-slate-900">{isNew ? "新規事例を登録" : "事例を編集"}</h1>
          <div className="flex items-center gap-2">
            <Badge variant={status === "published" ? "success" : "neutral"}>{status === "published" ? "公開中" : "下書き"}</Badge>
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
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-slate-700">
              事例タイトル
            </Label>
            <Input id="title" placeholder="例: ホストクラブA様の事例" {...form.register("title")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company" className="text-slate-700">
              店舗 / 企業名
            </Label>
            <Input id="company" placeholder="NightBase グループ" {...form.register("store_name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary" className="text-slate-700">
              サマリー / リード文
            </Label>
            <Textarea
              id="summary"
              rows={4}
              placeholder="事例の概要や読み出しとなるリード文を入力してください。"
              {...form.register("summary")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="problems" className="text-slate-700">
              導入前の課題（箇条書き可）
            </Label>
            <Textarea
              id="problems"
              rows={5}
              placeholder="課題や背景を入力してください。改行すると箇条書きとして表示されます。"
              {...form.register("problems")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="solutions" className="text-slate-700">
              NightBase の活用ポイント
            </Label>
            <Textarea
              id="solutions"
              rows={5}
              placeholder="NightBase の活用方法や運用のポイントを入力してください。"
              {...form.register("solutions")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="results" className="text-slate-700">
              導入後の変化・成果
            </Label>
            <Textarea id="results" rows={5} placeholder="効果やコメントを入力" {...form.register("results")} />
          </div>
        </section>
        <aside className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-slate-700">
              スラッグ
            </Label>
            <Input id="slug" placeholder="host-club-example" {...form.register("slug")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry" className="text-slate-700">
              業種
            </Label>
            <div className="space-y-2">
              <select
                id="industry"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
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
            <Label htmlFor="case_categories" className="text-slate-700">
              カテゴリ（複数選択可）
            </Label>
            <div className="flex gap-2">
              <Input
                id="case_categories"
                placeholder="カテゴリ名を入力して追加"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory(newCategory);
                    setNewCategory("");
                  }
                }}
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover_file" className="text-slate-700">
              カバー画像
            </Label>
            <Input
              id="cover_file"
              type="file"
              accept="image/*"
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/90 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-primary"
              onChange={handleCoverUpload}
              disabled={uploadingCover}
            />
            <p className="mt-1 text-xs text-slate-500">画像をアップロードすると URL が自動でセットされます。</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="published" className="text-slate-700">
              公開日時
            </Label>
            <Input
              id="published"
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
