"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { cn, formatDateTime } from "@/lib/utils";

type AdminUser = {
  id: string;
  display_name: string | null;
  email: string | null;
  role: "admin" | "editor" | "viewer" | string;
  updated_at: string | null;
  created_at: string | null;
};

type UsersState = {
  loading: boolean;
  error: string | null;
  users: AdminUser[];
};

const ROLE_OPTIONS: Array<{ value: "all" | "admin" | "editor" | "viewer"; label: string }> = [
  { value: "all", label: "すべて" },
  { value: "admin", label: "管理者" },
  { value: "editor", label: "編集" },
  { value: "viewer", label: "閲覧" },
];

function UsersContent({ supabase }: { supabase: any }) {
  const { toast } = useToast();
  const [state, setState] = useState<UsersState>({ loading: true, error: null, users: [] });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_OPTIONS)[number]["value"]>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, email, role, updated_at, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[AdminUsers] ユーザー取得エラー", error);
      setState({ loading: false, error: "ユーザーの取得に失敗しました", users: [] });
      return;
    }

    setState({ loading: false, error: null, users: (data ?? []) as AdminUser[] });
  }, [supabase]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return state.users.filter((user) => {
      const matchesSearch = normalizedSearch
        ? `${user.display_name ?? ""} ${user.email ?? ""}`.toLowerCase().includes(normalizedSearch)
        : true;
      const matchesRole = roleFilter === "all" ? true : user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [roleFilter, search, state.users]);

  async function handleRoleChange(userId: string, nextRole: "admin" | "editor" | "viewer") {
    setUpdatingId(userId);
    const { error } = await supabase.from("profiles").update({ role: nextRole }).eq("id", userId);
    if (error) {
      console.error("[AdminUsers] ロール変更エラー", error);
      toast({ title: "ロールの更新に失敗しました", description: error.message, variant: "destructive" });
      setUpdatingId(null);
      return;
    }

    setState((prev) => ({
      ...prev,
      users: prev.users.map((user) => (user.id === userId ? { ...user, role: nextRole } : user)),
    }));
    toast({ title: "ロールを更新しました" });
    setUpdatingId(null);
  }

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">ユーザー</p>
        <h1 className="text-4xl font-semibold text-white">ユーザー管理</h1>
        <p className="text-sm text-slate-400">Supabase の profiles テーブルと連携し、管理画面にアクセスできるユーザーを管理します。</p>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-center md:justify-between">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="名前やメールアドレスで検索"
          className="w-full md:w-80"
        />
        <div className="flex flex-wrap items-center gap-2">
          {ROLE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={roleFilter === option.value ? "default" : "outline"}
              className={cn(
                "text-sm",
                roleFilter === option.value
                  ? "bg-primary text-white"
                  : "border-white/20 text-slate-200 hover:bg-white/10 hover:text-white"
              )}
              onClick={() => setRoleFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
          <InviteUserButton />
        </div>
      </div>

      {state.loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">ユーザーを読み込んでいます…</div>
      ) : state.error ? (
        <div className="space-y-4 rounded-3xl border border-red-500/40 bg-red-500/10 p-8 text-center text-red-100">
          <p>{state.error}</p>
          <Button variant="outline" className="border-white/20 text-white" onClick={loadUsers}>
            再読み込み
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-slate-900/70 text-xs uppercase tracking-[0.25em] text-slate-400">
                <TableHead className="px-6">名前</TableHead>
                <TableHead>メールアドレス</TableHead>
                <TableHead>ロール</TableHead>
                <TableHead>最終更新</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-400">
                    条件に一致するユーザーがいません。
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-white/5">
                    <TableCell className="px-6 text-sm text-white">{user.display_name ?? "未設定"}</TableCell>
                    <TableCell className="text-sm text-slate-300">{user.email ?? "-"}</TableCell>
                    <TableCell>
                      <Badge className="bg-slate-800/80 text-slate-200">
                        {user.role === "admin"
                          ? "管理者"
                          : user.role === "editor"
                          ? "編集"
                          : "閲覧"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-300">{formatDateTime(user.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                        <span>ロール変更</span>
                        <select
                          className="rounded-xl border border-white/20 bg-slate-900/60 px-3 py-1 text-sm text-slate-100"
                          value={user.role}
                          onChange={(event) =>
                            handleRoleChange(
                              user.id,
                              event.target.value as "admin" | "editor" | "viewer"
                            )
                          }
                          disabled={updatingId === user.id}
                        >
                          <option value="admin">管理者</option>
                          <option value="editor">編集</option>
                          <option value="viewer">閲覧</option>
                        </select>
                      </label>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function InviteUserButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="border-white/20 text-white">
          ユーザー招待
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 text-white">
        <DialogHeader>
          <DialogTitle>ユーザー招待</DialogTitle>
          <DialogDescription className="text-slate-400">
            メールでの招待フローは近日追加予定です。いまは Supabase の Auth から直接ユーザーを作成してください。
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminProtected>
      {({ supabase }) => <UsersContent supabase={supabase} />}
    </AdminProtected>
  );
}
