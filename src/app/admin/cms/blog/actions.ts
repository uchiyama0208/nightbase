"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminServerClient } from "@/lib/auth";

const blogSchema = z.object({
  id: z.string().optional(),
  previousSlug: z.string().optional(),
  title: z.string().min(1, "タイトルは必須です"),
  slug: z.string().min(1, "スラッグは必須です"),
  content: z.string().min(1, "本文は必須です"),
  excerpt: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  cover_image_url: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]),
  published_at: z.string().optional().nullable()
});

export type BlogPayload = z.infer<typeof blogSchema>;

function normalizeDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

export async function upsertBlogPost(input: BlogPayload) {
  const values = blogSchema.parse(input);
  const { supabase } = await createAdminServerClient();

  const payload = {
    title: values.title,
    slug: values.slug,
    content: values.content,
    excerpt: values.excerpt ?? null,
    category: values.category ?? null,
    cover_image_url: values.cover_image_url ?? null,
    status: values.status,
    published_at: normalizeDate(values.published_at)
  };

  let id = values.id;
  let newSlug = values.slug;

  if (values.id) {
    const { data, error } = await supabase
      .from("blog_posts")
      .update(payload)
      .eq("id", values.id)
      .select("id, slug")
      .maybeSingle();

    if (error) {
      console.error("ブログ記事の更新に失敗しました", error);
      throw error;
    }

    id = data?.id ?? values.id;
    newSlug = data?.slug ?? values.slug;
  } else {
    const { data, error } = await supabase
      .from("blog_posts")
      .insert(payload)
      .select("id, slug")
      .maybeSingle();

    if (error) {
      console.error("ブログ記事の作成に失敗しました", error);
      throw error;
    }

    id = data?.id ?? undefined;
    newSlug = data?.slug ?? values.slug;
  }

  revalidatePath("/admin/cms/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${newSlug}`);

  if (values.previousSlug && values.previousSlug !== newSlug) {
    revalidatePath(`/blog/${values.previousSlug}`);
  }

  return { id, slug: newSlug };
}

export async function deleteBlogPost(id: string, slug?: string) {
  const { supabase } = await createAdminServerClient();

  const { error } = await supabase.from("blog_posts").delete().eq("id", id);

  if (error) {
    console.error("ブログ記事の削除に失敗しました", error);
    throw error;
  }

  revalidatePath("/admin/cms/blog");
  revalidatePath("/blog");
  if (slug) {
    revalidatePath(`/blog/${slug}`);
  }

  redirect("/admin/cms/blog");
}
