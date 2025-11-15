"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminServerClient } from "@/lib/auth";

const manualSchema = z.object({
  id: z.string().optional(),
  previousSlug: z.string().optional(),
  title: z.string().min(1, "タイトルは必須です"),
  slug: z.string().min(1, "スラッグは必須です"),
  section: z.string().min(1, "セクションは必須です"),
  body_markdown: z.string().min(1, "本文は必須です"),
  order: z.coerce.number().default(0),
  status: z.enum(["draft", "published"]).default("draft"),
  published_at: z.string().optional().nullable()
});

export type ManualPayload = z.infer<typeof manualSchema>;

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

export async function upsertManualPage(input: ManualPayload) {
  const values = manualSchema.parse(input);
  const { supabase } = await createAdminServerClient();

  const payload = {
    title: values.title,
    slug: values.slug,
    section: values.section,
    body_markdown: values.body_markdown,
    order: values.order,
    status: values.status,
    published_at: normalizeDate(values.published_at)
  };

  let id = values.id;
  let newSlug = values.slug;

  if (values.id) {
    const { data, error } = await supabase
      .from("manuals")
      .update(payload)
      .eq("id", values.id)
      .select("id, slug")
      .maybeSingle();

    if (error) {
      console.error("マニュアルの更新に失敗しました", error);
      throw error;
    }

    id = data?.id ?? values.id;
    newSlug = data?.slug ?? values.slug;
  } else {
    const { data, error } = await supabase
      .from("manuals")
      .insert(payload)
      .select("id, slug")
      .maybeSingle();

    if (error) {
      console.error("マニュアルの作成に失敗しました", error);
      throw error;
    }

    id = data?.id ?? undefined;
    newSlug = data?.slug ?? values.slug;
  }

  revalidatePath("/admin/cms/manuals");
  revalidatePath("/manual");
  revalidatePath(`/manual/${newSlug}`);

  if (values.previousSlug && values.previousSlug !== newSlug) {
    revalidatePath(`/manual/${values.previousSlug}`);
  }

  return { id, slug: newSlug };
}

export async function deleteManualPage(id: string, slug?: string) {
  const { supabase } = await createAdminServerClient();

  const { error } = await supabase.from("manuals").delete().eq("id", id);

  if (error) {
    console.error("マニュアルの削除に失敗しました", error);
    throw error;
  }

  revalidatePath("/admin/cms/manuals");
  revalidatePath("/manual");
  if (slug) {
    revalidatePath(`/manual/${slug}`);
  }

  redirect("/admin/cms/manuals");
}
