import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createAdminServerClient } from "@/lib/auth";
import { createServerClient } from "@/lib/supabaseClient";
import { toDateTimeLocalInputValue } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = {
  params: { id: string };
};

async function getCaseStudy(id: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("case_studies")
    .select(
      "id, slug, title, company_name, industry, summary, problems, solutions, results, cover_image_url, status, published_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("導入事例の取得に失敗しました", error);
    return null;
  }

  return data;
}

export default async function EditCaseStudyPage({ params }: Params) {
  const caseStudy = await getCaseStudy(params.id);

  if (!caseStudy) {
    notFound();
  }

  async function updateCaseStudy(formData: FormData) {
    "use server";

    const id = (formData.get("id") as string) ?? "";
    const originalSlug = (formData.get("original_slug") as string) ?? "";
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

    if (!id || !title || !slug || !companyName || !industry) {
      throw new Error("必須項目が不足しています");
    }

    const publishedAt = publishedAtRaw ? new Date(publishedAtRaw).toISOString() : null;

    const { supabase } = await createAdminServerClient();
    const { error } = await supabase
      .from("case_studies")
      .update({
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
      })
      .eq("id", id);

    if (error) {
      console.error("導入事例の更新に失敗しました", error);
      throw new Error("導入事例の更新に失敗しました");
    }

    revalidatePath("/admin/case-studies");
    revalidatePath("/case-studies");
    if (originalSlug) {
      revalidatePath(`/case-studies/${originalSlug}`);
    }
    revalidatePath(`/case-studies/${slug}`);
    redirect("/admin/case-studies");
  }

  async function deleteCaseStudy(formData: FormData) {
    "use server";

    const idValue =
      (formData.get("delete_id") as string) ?? (formData.get("id") as string) ?? "";
    const slugValue =
      (formData.get("delete_slug") as string) ?? (formData.get("slug") as string) ?? "";

    if (!idValue) {
      return;
    }

    const { supabase } = await createAdminServerClient();
    const { error } = await supabase.from("case_studies").delete().eq("id", idValue);

    if (error) {
      console.error("導入事例の削除に失敗しました", error);
      return;
    }

    revalidatePath("/admin/case-studies");
    revalidatePath("/case-studies");
    if (slugValue) {
      revalidatePath(`/case-studies/${slugValue}`);
    }
    redirect("/admin/case-studies");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-[#111111]">導入事例を編集</h1>
        <p className="text-sm text-neutral-600">Supabase 上の事例データを更新します。</p>
      </header>
      <form action={updateCaseStudy} className="space-y-6">
        <input type="hidden" name="id" value={caseStudy.id} />
        <input type="hidden" name="original_slug" value={caseStudy.slug} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            タイトル
            <input
              name="title"
              defaultValue={caseStudy.title}
              required
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            スラッグ
            <input
              name="slug"
              defaultValue={caseStudy.slug}
              required
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            店舗・企業名
            <input
              name="company_name"
              defaultValue={caseStudy.company_name}
              required
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            業種
            <input
              name="industry"
              defaultValue={caseStudy.industry}
              required
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
        </div>
        <label className="space-y-2 text-sm font-medium text-[#111111]">
          要約
          <textarea
            name="summary"
            rows={3}
            defaultValue={caseStudy.summary ?? ""}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-[#111111]">
          導入前の課題
          <textarea
            name="problems"
            rows={4}
            defaultValue={caseStudy.problems ?? ""}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-[#111111]">
          NightBase の活用
          <textarea
            name="solutions"
            rows={4}
            defaultValue={caseStudy.solutions ?? ""}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-[#111111]">
          導入後の変化・効果
          <textarea
            name="results"
            rows={4}
            defaultValue={caseStudy.results ?? ""}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            カバー画像 URL
            <input
              name="cover_image_url"
              defaultValue={caseStudy.cover_image_url ?? ""}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            ステータス
            <select
              name="status"
              defaultValue={caseStudy.status ?? "draft"}
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
            defaultValue={toDateTimeLocalInputValue(caseStudy.published_at)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <input type="hidden" name="delete_id" value={caseStudy.id} />
        <input type="hidden" name="delete_slug" value={caseStudy.slug} />
        <div className="flex flex-wrap justify-between gap-3">
          <button
            formAction={deleteCaseStudy}
            className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:border-red-400 hover:bg-red-50"
          >
            削除する
          </button>
          <Button type="submit">更新を保存</Button>
        </div>
      </form>
    </div>
  );
}
