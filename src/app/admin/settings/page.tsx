"use client";

import { useMemo, useState } from "react";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

function SettingsContent() {
  const { toast } = useToast();
  const [serviceName, setServiceName] = useState("NightBase");
  const [companyName, setCompanyName] = useState("NightBase, Inc.");
  const [siteUrl, setSiteUrl] = useState("https://nightbase.jp");
  const [adminTitle, setAdminTitle] = useState("NightBase Admin");
  const [logoUrl, setLogoUrl] = useState("https://nightbase.jp/logo.svg");
  const [primaryColor, setPrimaryColor] = useState("#0088FF");
  const [accentColor, setAccentColor] = useState("#FFCC00");
  const [contactEmail, setContactEmail] = useState("support@nightbase.jp");
  const [notifyNewContact, setNotifyNewContact] = useState(true);
  const [notifyNewContent, setNotifyNewContent] = useState(true);
  const [notifySystemAlert, setNotifySystemAlert] = useState(false);

  const handleGeneralSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("[AdminSettings] 一般設定", { serviceName, companyName, siteUrl });
    toast({ title: "一般設定を保存しました", description: "変更内容は即座に反映されます。" });
  };

  const handleBrandSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("[AdminSettings] ブランド設定", { adminTitle, logoUrl, primaryColor, accentColor });
    toast({ title: "ブランド設定を保存しました", description: "テーマカラーとロゴの設定を更新しました。" });
  };

  const handleNotificationSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("[AdminSettings] 通知設定", { contactEmail, notifyNewContact, notifyNewContent, notifySystemAlert });
    toast({ title: "通知設定を保存しました", description: "通知先メールアドレスを更新しました。" });
  };

  const roleNotes = useMemo(
    () => [
      { label: "admin", description: "すべての設定と CMS へアクセス可能" },
      { label: "editor", description: "CMS の編集と公開が可能" },
      { label: "viewer", description: "閲覧のみ" },
    ],
    []
  );

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">設定</p>
        <h1 className="text-4xl font-semibold text-white">設定</h1>
        <p className="text-sm text-slate-400">NightBase 管理画面全体の基本設定や通知設定を管理します。</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <form className="space-y-6" onSubmit={handleGeneralSave}>
            <div>
              <h2 className="text-xl font-semibold text-white">サービス情報</h2>
              <p className="text-sm text-slate-400">表示名や会社情報を管理します。</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="service-name" className="text-slate-200">サービス名</Label>
                <Input
                  id="service-name"
                  value={serviceName}
                  onChange={(event) => setServiceName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-name" className="text-slate-200">会社名</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-url" className="text-slate-200">サイト URL</Label>
              <Input
                id="site-url"
                type="url"
                value={siteUrl}
                onChange={(event) => setSiteUrl(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="bg-primary text-white" disabled={!serviceName.trim()}>
              一般設定を保存
            </Button>
          </form>

          <form className="space-y-6" onSubmit={handleBrandSave}>
            <div>
              <h2 className="text-xl font-semibold text-white">ブランド / 表示設定</h2>
              <p className="text-sm text-slate-400">管理画面の見出しやテーマカラーをカスタマイズします。</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-title" className="text-slate-200">管理画面タイトル</Label>
              <Input id="admin-title" value={adminTitle} onChange={(event) => setAdminTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo-url" className="text-slate-200">ロゴ画像 URL</Label>
              <Input id="logo-url" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primary-color" className="text-slate-200">プライマリカラー</Label>
                <Input
                  id="primary-color"
                  type="color"
                  value={primaryColor}
                  onChange={(event) => setPrimaryColor(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accent-color" className="text-slate-200">アクセントカラー</Label>
                <Input
                  id="accent-color"
                  type="color"
                  value={accentColor}
                  onChange={(event) => setAccentColor(event.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="bg-primary text-white">
              表示設定を保存
            </Button>
          </form>
        </section>

        <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <form className="space-y-6" onSubmit={handleNotificationSave}>
            <div>
              <h2 className="text-xl font-semibold text-white">通知設定</h2>
              <p className="text-sm text-slate-400">問い合わせや公開イベントの通知を設定します。</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email" className="text-slate-200">通知メールアドレス</Label>
              <Input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-3">
              <NotificationToggle
                label="新しいお問い合わせ"
                description="問い合わせフォームからの送信を通知"
                checked={notifyNewContact}
                onCheckedChange={setNotifyNewContact}
              />
              <NotificationToggle
                label="新しいコンテンツ公開"
                description="ブログやマニュアルが公開されたとき"
                checked={notifyNewContent}
                onCheckedChange={setNotifyNewContent}
              />
              <NotificationToggle
                label="システムアラート"
                description="エラー通知や障害情報を受け取る"
                checked={notifySystemAlert}
                onCheckedChange={setNotifySystemAlert}
              />
            </div>
            <Button type="submit" className="bg-primary text-white">
              通知設定を保存
            </Button>
          </form>

          <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
            <h3 className="text-lg font-semibold text-white">権限 / ロール説明</h3>
            <p className="text-sm text-slate-400">ロールに応じたアクセスレベルをチームで共有してください。</p>
            <ul className="space-y-3 text-sm text-slate-300">
              {roleNotes.map((note) => (
                <li key={note.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="font-semibold text-white">{note.label.toUpperCase()}</p>
                  <p className="text-slate-400">{note.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span>
        <p className="font-medium text-white">{label}</p>
        <p className="text-sm text-slate-400">{description}</p>
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

export default function AdminSettingsPage() {
  return <AdminProtected>{() => <SettingsContent />}</AdminProtected>;
}
