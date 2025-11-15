"use server";

import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabaseServerClient";

export async function signOut() {
  const supabase = createServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("サインアウトに失敗しました", error);
  }

  redirect("/");
}
