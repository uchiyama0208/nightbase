import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createAdminServerClient } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function NewManualPage() {
  async function createManual(formData: FormData) {
    "use server";

    const title = (formData.get("title") as string)?.trim();
    const slug = (formData.get("slug") as string)?.trim();
    const category = (formData.get("category") as string)?.trim();
    const summary = (formData.get("summary") as string)?.trim();
    const bodyMarkdown = (formData.get("body_markdown") as string)?.trim();
    const orderValue = parseInt((formData.get("order") as string) ?? "0", 10);
    const status = (formData.get("status") as string)?.trim() || "draft";
    const publishedAtRaw = (formData.get("published_at") as string)?.trim();

    if (!title || !slug || !category || !bodyMarkdown) {
      throw new Error("必須項目が不足しています");
    }

    const publishedAt = publishedAtRaw ? new Date(publishedAtRaw).toISOString() : null;

    const { supabase } = await createAdminServerClient();
    const { error } = await supabase.from("manual_pages").insert({
      title,
      slug,
      category,
      summary: summary || null,
      body_markdown: bodyMarkdown,
      order: Number.isNaN(orderValue) ? 0 : orderValue,
      status,
      published_at: publishedAt,
    });

    if (error) {
      console.error("マニュアルの作成に失敗しました", error);
      throw new Error("マニュアルの作成に失敗しました");
    }

    revalidatePath("/admin/manual");
    revalidatePath("/manual");
    revalidatePath(`/manual/${slug}`);
    redirect("/admin/manual");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-[#111111]">新規マニュアルを作成</h1>
        <p className="text-sm text-neutral-600">Supabase manual_pages テーブルに Markdown マニュアルを追加します。</p>
      </header>
      <form action={createManual} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            タイトル
            <input
              name="title"
              required
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            スラッグ
            <input
              name="slug"
              required
              placeholder="例: getting-started"
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            カテゴリ
            <input
              name="category"
              required
              placeholder="例: onboarding"
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            並び順
            <input
              name="order"
              type="number"
              defaultValue={0}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            ステータス
            <select
              name="status"
              defaultValue="draft"
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </label>
        </div>
        <label className="space-y-2 text-sm font-medium text-[#111111]">
          要約（任意）
          <textarea
            name="summary"
            rows={3}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-[#111111]">
          本文（Markdown）
          <textarea
            name="body_markdown"
            rows={12}
            required
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-[#111111]">
          公開日時
          <input
            type="datetime-local"
            name="published_at"
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <div className="flex justify-end">
          <Button type="submit">保存する</Button>
        </div>
      </form>
    </div>
  );
}
