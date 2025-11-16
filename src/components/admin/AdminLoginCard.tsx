"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserClient } from "@/lib/supabaseClient";

export function AdminLoginCard() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("ログインに失敗しました。メールアドレスとパスワードをご確認ください。");
      return;
    }

    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white/95 p-8 text-slate-900 shadow-2xl">
      <h1 className="mb-3 text-2xl font-semibold">管理画面にログイン</h1>
      <p className="mb-6 text-sm text-slate-600">
        NightBase の管理者アカウントでサインインしてください。
      </p>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="admin-email">メールアドレス</Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={loading}
            className="bg-white/80"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-password">パスワード</Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={loading}
            className="bg-white/80"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white hover:bg-primary/90"
        >
          {loading ? "ログイン中…" : "ログイン"}
        </Button>
      </form>
    </div>
  );
}
