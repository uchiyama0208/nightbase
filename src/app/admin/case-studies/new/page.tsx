import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createAdminServerClient } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function NewCaseStudyPage() {
  async function createCaseStudy(formData: FormData) {
    "use server";

    const title = (formData.get("title") as string)?.trim();
    const slug = (formData.get("slug") as string)?.trim();
    const companyName = (formData.get("company_name") as string)?.trim();
    const industry = (formData.get("industry") as string)?.trim();
    const summary = (formData.get("summary") as string)?.trim();
    const problems = (formData.get("problems") as string)?.trim();
    const solutions = (formData.get("solutions") as string)?.trim();
    const results = (formData.get("results") as string)?.trim();
    const coverImageUrl = (formData.get("cover_image_url") as string)?.trim();
    const status = (formData.get("status") as string)?.trim() || "draft";
    const publishedAtRaw = (formData.get("published_at") as string)?.trim();

    if (!title || !slug || !companyName || !industry) {
      throw new Error("必須項目が不足しています");
    }

    const publishedAt = publishedAtRaw ? new Date(publishedAtRaw).toISOString() : null;

    const { supabase } = await createAdminServerClient();
    const { error } = await supabase.from("case_studies").insert({
      title,
      slug,
      company_name: companyName,
      industry,
      summary: summary || null,
      problems: problems || null,
      solutions: solutions || null,
      results: results || null,
      cover_image_url: coverImageUrl || null,
      status,
      published_at: publishedAt,
    });

    if (error) {
      console.error("導入事例の作成に失敗しました", error);
      throw new Error("導入事例の作成に失敗しました");
    }

    revalidatePath("/admin/case-studies");
    revalidatePath("/case-studies");
    revalidatePath(`/case-studies/${slug}`);
    redirect("/admin/case-studies");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-[#111111]">新規導入事例を作成</h1>
        <p className="text-sm text-neutral-600">Supabase の case_studies テーブルに新しい事例を追加します。</p>
      </header>
      <form action={createCaseStudy} className="space-y-6">
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
              placeholder="例: host-club-example"
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            店舗・企業名
            <input
              name="company_name"
              required
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            業種
            <input
              name="industry"
              required
              placeholder="例: cabaret"
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
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
          導入前の課題
          <textarea
            name="problems"
            rows={4}
            placeholder="箇条書きの場合は改行で区切ってください"
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-[#111111]">
          NightBase の活用
          <textarea
            name="solutions"
            rows={4}
            placeholder="実施した取り組みや機能の活用ポイント"
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-[#111111]">
          導入後の変化・効果
          <textarea
            name="results"
            rows={4}
            placeholder="効果やコメントを入力してください"
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            カバー画像 URL
            <input
              name="cover_image_url"
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
