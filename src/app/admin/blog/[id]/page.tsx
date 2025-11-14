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

async function getBlogPost(id: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, slug, title, content, excerpt, cover_image_url, category, status, published_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("ブログ記事の取得に失敗しました", error);
    return null;
  }

  return data;
}

export default async function EditBlogPostPage({ params }: Params) {
  const post = await getBlogPost(params.id);

  if (!post) {
    notFound();
  }

  async function updatePost(formData: FormData) {
    "use server";

    const id = (formData.get("id") as string) ?? "";
    const originalSlug = (formData.get("original_slug") as string) ?? "";
    const title = (formData.get("title") as string)?.trim();
    const slug = (formData.get("slug") as string)?.trim();
    const content = (formData.get("content") as string)?.trim();
    const excerpt = (formData.get("excerpt") as string)?.trim();
    const category = (formData.get("category") as string)?.trim();
    const coverImageUrl = (formData.get("cover_image_url") as string)?.trim();
    const status = (formData.get("status") as string)?.trim() || "draft";
    const publishedAtRaw = (formData.get("published_at") as string)?.trim();

    if (!id || !title || !slug || !content) {
      throw new Error("必須項目が不足しています");
    }

    const publishedAt = publishedAtRaw ? new Date(publishedAtRaw).toISOString() : null;

    const { supabase } = await createAdminServerClient();
    const { error } = await supabase
      .from("blog_posts")
      .update({
        title,
        slug,
        content,
        excerpt: excerpt || null,
        category: category || null,
        cover_image_url: coverImageUrl || null,
        status,
        published_at: publishedAt,
      })
      .eq("id", id);

    if (error) {
      console.error("ブログ記事の更新に失敗しました", error);
      throw new Error("ブログ記事の更新に失敗しました");
    }

    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    if (originalSlug) {
      revalidatePath(`/blog/${originalSlug}`);
    }
    revalidatePath(`/blog/${slug}`);
    redirect("/admin/blog");
  }

  async function deletePost(formData: FormData) {
    "use server";

    const idValue =
      (formData.get("delete_id") as string) ?? (formData.get("id") as string) ?? "";
    const slugValue =
      (formData.get("delete_slug") as string) ?? (formData.get("slug") as string) ?? "";

    if (!idValue) {
      return;
    }

    const { supabase } = await createAdminServerClient();
    const { error } = await supabase.from("blog_posts").delete().eq("id", idValue);

    if (error) {
      console.error("ブログ記事の削除に失敗しました", error);
      return;
    }

    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    if (slugValue) {
      revalidatePath(`/blog/${slugValue}`);
    }
    redirect("/admin/blog");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-[#111111]">ブログ記事を編集</h1>
        <p className="text-sm text-neutral-600">Supabase に保存されている内容を更新します。</p>
      </header>
      <form action={updatePost} className="space-y-6">
        <input type="hidden" name="id" value={post.id} />
        <input type="hidden" name="original_slug" value={post.slug} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            タイトル
            <input
              name="title"
              defaultValue={post.title}
              required
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            スラッグ
            <input
              name="slug"
              defaultValue={post.slug}
              required
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            カテゴリ
            <input
              name="category"
              defaultValue={post.category ?? ""}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#111111]">
            ステータス
            <select
              name="status"
              defaultValue={post.status ?? "draft"}
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
            defaultValue={post.cover_image_url ?? ""}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-[#111111]">
          公開日時
          <input
            type="datetime-local"
            name="published_at"
            defaultValue={toDateTimeLocalInputValue(post.published_at)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-[#111111]">
          要約
          <textarea
            name="excerpt"
            rows={3}
            defaultValue={post.excerpt ?? ""}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-[#111111]">
          本文
          <textarea
            name="content"
            rows={12}
            defaultValue={post.content}
            required
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-[#111111] focus:border-primary focus:outline-none"
          />
        </label>
        <input type="hidden" name="delete_id" value={post.id} />
        <input type="hidden" name="delete_slug" value={post.slug} />
        <div className="flex flex-wrap justify-between gap-3">
          <button
            formAction={deletePost}
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
