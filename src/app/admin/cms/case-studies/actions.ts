"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminServerClient } from "@/lib/auth";

const caseStudySchema = z.object({
  id: z.string().optional(),
  previousSlug: z.string().optional(),
  title: z.string().min(1, "タイトルは必須です"),
  slug: z.string().min(1, "スラッグは必須です"),
  company_name: z.string().min(1, "店舗名・企業名は必須です"),
  industry: z.string().min(1, "業種は必須です"),
  summary: z.string().optional().nullable(),
  problems: z.string().optional().nullable(),
  solutions: z.string().optional().nullable(),
  results: z.string().optional().nullable(),
  cover_image_url: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]).default("draft"),
  published_at: z.string().optional().nullable()
});

export type CaseStudyPayload = z.infer<typeof caseStudySchema>;

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

export async function upsertCaseStudy(input: CaseStudyPayload) {
  const values = caseStudySchema.parse(input);
  const { supabase } = await createAdminServerClient();

  const payload = {
    title: values.title,
    slug: values.slug,
    company_name: values.company_name,
    industry: values.industry,
    summary: values.summary ?? null,
    problems: values.problems ?? null,
    solutions: values.solutions ?? null,
    results: values.results ?? null,
    cover_image_url: values.cover_image_url ?? null,
    status: values.status,
    published_at: normalizeDate(values.published_at)
  };

  let id = values.id;
  let newSlug = values.slug;

  if (values.id) {
    const { data, error } = await supabase
      .from("case_studies")
      .update(payload)
      .eq("id", values.id)
      .select("id, slug")
      .maybeSingle();

    if (error) {
      console.error("導入事例の更新に失敗しました", error);
      throw error;
    }

    id = data?.id ?? values.id;
    newSlug = data?.slug ?? values.slug;
  } else {
    const { data, error } = await supabase
      .from("case_studies")
      .insert(payload)
      .select("id, slug")
      .maybeSingle();

    if (error) {
      console.error("導入事例の作成に失敗しました", error);
      throw error;
    }

    id = data?.id ?? undefined;
    newSlug = data?.slug ?? values.slug;
  }

  revalidatePath("/admin/cms/case-studies");
  revalidatePath("/case-studies");
  revalidatePath(`/case-studies/${newSlug}`);

  if (values.previousSlug && values.previousSlug !== newSlug) {
    revalidatePath(`/case-studies/${values.previousSlug}`);
  }

  return { id, slug: newSlug };
}

export async function deleteCaseStudy(id: string, slug?: string) {
  const { supabase } = await createAdminServerClient();

  const { error } = await supabase.from("case_studies").delete().eq("id", id);

  if (error) {
    console.error("導入事例の削除に失敗しました", error);
    throw error;
  }

  revalidatePath("/admin/cms/case-studies");
  revalidatePath("/case-studies");
  if (slug) {
    revalidatePath(`/case-studies/${slug}`);
  }

  redirect("/admin/cms/case-studies");
}
