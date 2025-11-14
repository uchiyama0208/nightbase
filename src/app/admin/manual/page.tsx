import Link from "next/link";
import { revalidatePath } from "next/cache";

import { buttonVariants } from "@/components/ui/button";
import { createAdminServerClient } from "@/lib/auth";
import { createServerClient } from "@/lib/supabaseClient";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchManualPages() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("manual_pages")
    .select("id, slug, title, category, status, order, updated_at, published_at")
    .order("category", { ascending: true })
    .order("order", { ascending: true });

  if (error) {
    console.error("マニュアル一覧の取得に失敗しました", error);
    return [];
  }

  return data ?? [];
}

export default async function AdminManualPage() {
  const manuals = await fetchManualPages();

  async function deleteManual(formData: FormData) {
    "use server";

    const id = formData.get("id");

    if (!id || typeof id !== "string") {
      return;
    }

    const { supabase } = await createAdminServerClient();
    const { data: existing } = await supabase
      .from("manual_pages")
      .select("slug")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("manual_pages").delete().eq("id", id);

    if (error) {
      console.error("マニュアルの削除に失敗しました", error);
      return;
    }

    revalidatePath("/admin/manual");
    revalidatePath("/manual");
    if (existing?.slug) {
      revalidatePath(`/manual/${existing.slug}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#111111]">マニュアル管理</h1>
          <p className="text-sm text-neutral-600">manual_pages テーブルを編集してオンラインマニュアルを更新します。</p>
        </div>
        <Link href="/admin/manual/new" className={buttonVariants({ variant: "default" })}>
          新規マニュアルを作成
        </Link>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-neutral-200">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-widest text-neutral-500">
            <tr>
              <th className="px-4 py-3">カテゴリ</th>
              <th className="px-4 py-3">タイトル</th>
              <th className="px-4 py-3">並び順</th>
              <th className="px-4 py-3">ステータス</th>
              <th className="px-4 py-3">公開日</th>
              <th className="px-4 py-3">更新日</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {manuals.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                  まだマニュアルが登録されていません。
                </td>
              </tr>
            ) : (
              manuals.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-600">{item.category}</td>
                  <td className="px-4 py-3 font-medium text-[#111111]">{item.title}</td>
                  <td className="px-4 py-3 text-neutral-600">{item.order ?? 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.status === "published"
                          ? "bg-primary/10 text-primary"
                          : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{formatDate(item.published_at)}</td>
                  <td className="px-4 py-3 text-neutral-600">{formatDate(item.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/manual/${item.slug}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        公開ページ
                      </Link>
                      <Link
                        href={`/admin/manual/${item.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        編集
                      </Link>
                      <form action={deleteManual}>
                        <input type="hidden" name="id" value={item.id} />
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
