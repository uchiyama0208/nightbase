import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createAdminServerClient } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function NewBlogPostPage() {
  async function createBlogPost(formData: FormData) {
    "use server";

    const title = (formData.get("title") as string)?.trim();
    const slug = (formData.get("slug") as string)?.trim();
    const content = (formData.get("content") as string)?.trim();
    const excerpt = (formData.get("excerpt") as string)?.trim();
    const category = (formData.get("category") as string)?.trim();
    const coverImageUrl = (formData.get("cover_image_url") as string)?.trim();
    const status = (formData.get("status") as string)?.trim() || "draft";
    const publishedAtRaw = (formData.get("published_at") as string)?.trim();

    if (!title || !slug || !content) {
      throw new Error("必須項目が不足しています");
    }

    const publishedAt = publishedAtRaw ? new Date(publishedAtRaw).toISOString() : null;

    const { supabase } = await createAdminServerClient();
    const { error } = await supabase.from("blog_posts").insert({
      title,
      slug,
      content,
      excerpt: excerpt || null,
      category: category || null,
      cover_image_url: coverImageUrl || null,
      status,
      published_at: publishedAt,
    });

    if (error) {
      console.error("ブログ記事の作成に失敗しました", error);
      throw new Error("ブログ記事の作成に失敗しました");
    }

    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    revalidatePath(`/blog/${slug}`);
    redirect("/admin/blog");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-[#111111]">新規ブログ記事を作成</h1>
        <p className="text-sm text-neutral-600">
          必要な項目を入力して、Supabase の blog_posts テーブルに保存します。
        </p>
      </header>
      <form action={createBlogPost} className="space-y-6">
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
              placeholder="例: first-post"
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            カテゴリ
            <input
              name="category"
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
          アイキャッチ画像 URL
          <input
            name="cover_image_url"
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
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
        <label className="space-y-2 text-sm font-medium text-[#111111]">
          要約（任意）
          <textarea
            name="excerpt"
            rows={3}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-[#111111]">
          本文
          <textarea
            name="content"
            rows={12}
            required
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <div className="flex justify-end gap-3">
          <Button type="submit">保存する</Button>
        </div>
      </form>
    </div>
  );
}
