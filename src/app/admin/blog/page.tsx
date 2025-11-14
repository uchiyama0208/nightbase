import Link from "next/link";
import { revalidatePath } from "next/cache";

import { buttonVariants } from "@/components/ui/button";
import { createAdminServerClient } from "@/lib/auth";
import { createServerClient } from "@/lib/supabaseClient";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchBlogPosts() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, title, slug, status, category, published_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("ブログ記事一覧の取得に失敗しました", error);
    return [];
  }

  return data ?? [];
}

export default async function AdminBlogPage() {
  const posts = await fetchBlogPosts();

  async function deletePost(formData: FormData) {
    "use server";

    const id = formData.get("id");

    if (!id || typeof id !== "string") {
      return;
    }

    const { supabase } = await createAdminServerClient();
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("blog_posts").delete().eq("id", id);

    if (error) {
      console.error("ブログ記事の削除に失敗しました", error);
      return;
    }

    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    if (existing?.slug) {
      revalidatePath(`/blog/${existing.slug}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#111111]">ブログ管理</h1>
          <p className="text-sm text-neutral-600">
            Supabase の blog_posts テーブルと連携した記事管理画面です。
          </p>
        </div>
        <Link href="/admin/blog/new" className={buttonVariants({ variant: "default" })}>
          新規記事を作成
        </Link>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-neutral-200">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-widest text-neutral-500">
            <tr>
              <th className="px-4 py-3">タイトル</th>
              <th className="px-4 py-3">カテゴリ</th>
              <th className="px-4 py-3">ステータス</th>
              <th className="px-4 py-3">公開日</th>
              <th className="px-4 py-3">更新日</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {posts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  まだ記事が登録されていません。
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-[#111111]">{post.title}</td>
                  <td className="px-4 py-3 text-neutral-600">{post.category ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        post.status === "published"
                          ? "bg-primary/10 text-primary"
                          : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{formatDate(post.published_at)}</td>
                  <td className="px-4 py-3 text-neutral-600">{formatDate(post.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/blog/${post.slug}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        公開ページ
                      </Link>
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        編集
                      </Link>
                      <form action={deletePost}>
                        <input type="hidden" name="id" value={post.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition hover:border-red-400 hover:bg-red-50"
                        >
                          削除
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
