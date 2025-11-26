"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, ShieldCheck } from "lucide-react";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

function AccountSettingsContent({ supabase }: { supabase: any }) {
  const { toast } = useToast();
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loadAccount = useCallback(async () => {
    setProfileLoading(true);
    try {
      const [userResult, profileResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles").select("id, user_id, display_name, email").maybeSingle()
      ]);

      if (userResult.error) {
        console.error("[AdminSettings] auth.getUser error", userResult.error);
      }

      const user = userResult.data?.user ?? null;
      if (user) {
        setUserId(user.id);
        setEmail(user.email ?? "");
      }

      if (profileResult.error) {
        console.error("[AdminSettings] profiles fetch error", profileResult.error);
      }

      if (profileResult.data) {
        setDisplayName(profileResult.data.display_name ?? "");
        if (profileResult.data.email) {
          setEmail(profileResult.data.email);
        }
      }
    } finally {
      setProfileLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      toast({ title: "プロフィールを更新できません", description: "再度ログインしてください。" });
      return;
    }

    setProfileSaving(true);
    try {
      const trimmedName = displayName.trim();
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: trimmedName || null, email: email || null })
        .eq("user_id", userId);

      if (error) {
        console.error("[AdminSettings] プロフィール更新エラー", error);
        toast({ title: "プロフィール更新に失敗しました", description: error.message ?? "時間をおいて再度お試しください。" });
        return;
      }

      toast({ title: "プロフィールを更新しました", description: "表示名を保存しました。" });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleEmailChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newEmail.trim()) {
      toast({ title: "メールアドレスを入力してください" });
      return;
    }
    if (newEmail.trim() === email) {
      toast({ title: "現在と同じメールアドレスです" });
      return;
    }
    if (!emailPassword) {
      toast({ title: "現在のパスワードを入力してください" });
      return;
    }

    setEmailSaving(true);
    try {
      const currentEmail = email || (await supabase.auth.getUser()).data?.user?.email;
      if (!currentEmail) {
        toast({ title: "メールアドレス情報を取得できませんでした" });
        return;
      }

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: emailPassword
      });

      if (reauthError) {
        console.error("[AdminSettings] メール再認証エラー", reauthError);
        toast({ title: "パスワードが正しくありません", description: reauthError.message });
        return;
      }

      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      console.log("[AdminSettings] メール更新結果", { error });

      if (error) {
        toast({ title: "メールアドレスの変更に失敗しました", description: error.message });
        return;
      }

      toast({ title: "メールアドレスを変更しました", description: "確認メールを送信しました。" });
      setEmail(newEmail.trim());
      setNewEmail("");
      setEmailPassword("");
    } finally {
      setEmailSaving(false);
    }
  };

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "すべてのパスワード欄を入力してください" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "新しいパスワードは8文字以上にしてください" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "新しいパスワードが一致しません" });
      return;
    }

    setPasswordSaving(true);
    try {
      const currentEmail = email || (await supabase.auth.getUser()).data?.user?.email;
      if (!currentEmail) {
        toast({ title: "メールアドレス情報を取得できませんでした" });
        return;
      }

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword
      });

      if (reauthError) {
        console.error("[AdminSettings] パスワード再認証エラー", reauthError);
        toast({ title: "現在のパスワードが正しくありません", description: reauthError.message });
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      console.log("[AdminSettings] パスワード更新結果", { error });

      if (error) {
        toast({ title: "パスワードの変更に失敗しました", description: error.message });
        return;
      }

      toast({ title: "パスワードを変更しました", description: "次回ログイン時から新しいパスワードが適用されます。" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-10 p-8">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">設定</p>
        <h1 className="text-4xl font-semibold text-slate-900">アカウント設定</h1>
        <p className="text-sm text-slate-500">NightBase 管理画面で使用するご自身のアカウント情報を更新します。</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">プロフィール</h2>
            <p className="text-sm text-slate-500">表示名と連絡先を管理します。</p>
          </div>
          <form className="space-y-5" onSubmit={handleProfileSave}>
            <div className="space-y-2">
              <Label htmlFor="display-name" className="text-slate-700">
                表示名
              </Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="NightBase 管理者"
                disabled={profileLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current-email" className="text-slate-700">
                現在のメールアドレス
              </Label>
              <Input id="current-email" value={email} disabled readOnly className="bg-slate-100 text-slate-700" />
            </div>
            <Button type="submit" className="bg-primary text-white" disabled={profileSaving || profileLoading}>
              {profileSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              プロフィールを保存
            </Button>
          </form>
        </section>

        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">メールアドレス</h2>
            <p className="text-sm text-slate-500">新しいメールアドレスと現在のパスワードを入力してください。</p>
          </div>
          <form className="space-y-5" onSubmit={handleEmailChange}>
            <div className="space-y-2">
              <Label htmlFor="new-email" className="text-slate-700">
                新しいメールアドレス
              </Label>
              <Input
                id="new-email"
                type="email"
                placeholder="you@example.com"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-password" className="text-slate-700">
                現在のパスワード
              </Label>
              <Input
                id="email-password"
                type="password"
                placeholder="現在のパスワード"
                value={emailPassword}
                onChange={(event) => setEmailPassword(event.target.value)}
              />
            </div>
            <Button type="submit" className="bg-primary text-white" disabled={emailSaving}>
              {emailSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              メールアドレスを変更
            </Button>
          </form>
        </section>
      </div>

      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">パスワード</h2>
          <p className="text-sm text-slate-500">安全なパスワードに更新してください。</p>
        </div>
        <form className="grid gap-5 md:grid-cols-2" onSubmit={handlePasswordChange}>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="current-password" className="text-slate-700">
              現在のパスワード
            </Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="現在のパスワード"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-slate-700">
              新しいパスワード
            </Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="8文字以上"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-slate-700">
              新しいパスワード（確認）
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="もう一度入力"
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" className="bg-primary text-white" disabled={passwordSaving}>
              {passwordSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              パスワードを変更
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-3xl border border-red-500/40 bg-red-500/5 p-6">
        <div>
          <h2 className="text-xl font-semibold text-red-900">ログアウト</h2>
          <p className="text-sm text-red-700">現在の管理画面セッションを終了します。</p>
        </div>
        <Button
          type="button"
          variant="destructive"
          className="bg-red-600 hover:bg-red-500"
          onClick={async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) {
                throw error;
              }
              toast({ title: "ログアウトしました", description: "ログイン画面に戻ります。" });
              window.location.href = "/admin";
            } catch (error) {
              console.error("[AdminSettings] ログアウトに失敗しました", error);
              toast({
                title: "ログアウトに失敗しました",
                description: error instanceof Error ? error.message : "時間をおいて再度お試しください。",
              });
            }
          }}
        >
          ログアウト
        </Button>
      </section>
    </div>
  );
}

export default function AdminSettingsPage() {
  return <AdminProtected>{({ supabase }) => <AccountSettingsContent supabase={supabase} />}</AdminProtected>;
}

export const dynamic = 'force-dynamic';
