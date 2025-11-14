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

async function getManualPage(id: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("manual_pages")
    .select(
      "id, slug, title, category, summary, body_markdown, order, status, published_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("マニュアルの取得に失敗しました", error);
    return null;
  }

  return data;
}

export default async function EditManualPage({ params }: Params) {
  const manual = await getManualPage(params.id);

  if (!manual) {
    notFound();
  }

  async function updateManual(formData: FormData) {
    "use server";

    const id = (formData.get("id") as string) ?? "";
    const originalSlug = (formData.get("original_slug") as string) ?? "";
    const title = (formData.get("title") as string)?.trim();
    const slug = (formData.get("slug") as string)?.trim();
    const category = (formData.get("category") as string)?.trim();
    const summary = (formData.get("summary") as string)?.trim();
    const bodyMarkdown = (formData.get("body_markdown") as string)?.trim();
    const orderValue = parseInt((formData.get("order") as string) ?? "0", 10);
    const status = (formData.get("status") as string)?.trim() || "draft";
    const publishedAtRaw = (formData.get("published_at") as string)?.trim();

    if (!id || !title || !slug || !category || !bodyMarkdown) {
      throw new Error("必須項目が不足しています");
    }

    const publishedAt = publishedAtRaw ? new Date(publishedAtRaw).toISOString() : null;

    const { supabase } = await createAdminServerClient();
    const { error } = await supabase
      .from("manual_pages")
      .update({
        title,
        slug,
        category,
        summary: summary || null,
        body_markdown: bodyMarkdown,
        order: Number.isNaN(orderValue) ? 0 : orderValue,
        status,
        published_at: publishedAt,
      })
      .eq("id", id);

    if (error) {
      console.error("マニュアルの更新に失敗しました", error);
      throw new Error("マニュアルの更新に失敗しました");
    }

    revalidatePath("/admin/manual");
    revalidatePath("/manual");
    if (originalSlug) {
      revalidatePath(`/manual/${originalSlug}`);
    }
    revalidatePath(`/manual/${slug}`);
    redirect("/admin/manual");
  }

  async function deleteManual(formData: FormData) {
    "use server";

    const idValue =
      (formData.get("delete_id") as string) ?? (formData.get("id") as string) ?? "";
    const slugValue =
      (formData.get("delete_slug") as string) ?? (formData.get("slug") as string) ?? "";

    if (!idValue) {
      return;
    }

    const { supabase } = await createAdminServerClient();
    const { error } = await supabase.from("manual_pages").delete().eq("id", idValue);

    if (error) {
      console.error("マニュアルの削除に失敗しました", error);
      return;
    }

    revalidatePath("/admin/manual");
    revalidatePath("/manual");
    if (slugValue) {
      revalidatePath(`/manual/${slugValue}`);
    }
    redirect("/admin/manual");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-[#111111]">マニュアルを編集</h1>
        <p className="text-sm text-neutral-600">手順や設定情報を最新の内容に更新しましょう。</p>
      </header>
      <form action={updateManual} className="space-y-6">
        <input type="hidden" name="id" value={manual.id} />
        <input type="hidden" name="original_slug" value={manual.slug} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            タイトル
            <input
              name="title"
              defaultValue={manual.title}
              required
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            スラッグ
            <input
              name="slug"
              defaultValue={manual.slug}
              required
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            カテゴリ
            <input
              name="category"
              defaultValue={manual.category}
              required
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            並び順
            <input
              name="order"
              type="number"
              defaultValue={manual.order ?? 0}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            ステータス
            <select
              name="status"
              defaultValue={manual.status ?? "draft"}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </label>
        </div>
        <label className="space-y-2 text-sm font-medium text-[#111111]">
          要約
          <textarea
            name="summary"
            rows={3}
            defaultValue={manual.summary ?? ""}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-[#111111]">
          本文（Markdown）
          <textarea
            name="body_markdown"
            rows={12}
            defaultValue={manual.body_markdown}
            required
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-[#111111]">
          公開日時
          <input
            type="datetime-local"
            name="published_at"
            defaultValue={toDateTimeLocalInputValue(manual.published_at)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <input type="hidden" name="delete_id" value={manual.id} />
        <input type="hidden" name="delete_slug" value={manual.slug} />
        <div className="flex flex-wrap justify-between gap-3">
          <button
            formAction={deleteManual}
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
