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
  const [showPassword, setShowPassword] = useState(false);
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
      <form className="space-y-5" onSubmit={handleSubmit} autoComplete="on">
        <div className="space-y-2">
          <Label htmlFor="admin-email">メールアドレス</Label>
          <Input
            id="admin-email"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={loading}
            className="border-slate-200 bg-white/90 text-slate-900 placeholder:text-slate-400"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-password">パスワード</Label>
          <Input
            id="admin-password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={loading}
            className="border-slate-200 bg-white/90 text-slate-900 placeholder:text-slate-400"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600" htmlFor="admin-show-password">
            <input
              id="admin-show-password"
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
              disabled={loading}
            />
            パスワードを表示
          </label>
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
