"use client";

import Image from "next/image";

import { useState } from "react";
import { createInvitation } from "./actions";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Check, X, Plus, ChevronLeft, UserPlus, Link2, Hash, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { UserEditModal } from "../users/user-edit-modal";
import { toast } from "@/components/ui/use-toast";
import { updateJoinRequestSettings } from "./actions";

type InviteMethod = "select" | "profile" | "url" | "code";

interface StoreSettings {
    id: string;
    allow_join_requests: boolean;
    allow_join_by_code: boolean;
    allow_join_by_url: boolean;
}

interface Profile {
    id: string;
    display_name: string;
    display_name_kana?: string;
    role: string;
    avatar_url: string | null;
}

interface Role {
    id: string;
    name: string;
    permissions?: {
        target?: "staff" | "cast";
        [key: string]: any;
    };
}

interface PagePermissions {
    bottles: boolean;
    resumes: boolean;
    salarySystems: boolean;
    attendance: boolean;
    personalInfo: boolean;
}

interface InvitationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uninvitedProfiles: Profile[];
    roles: Role[];
    pagePermissions?: PagePermissions;
    storeId?: string;
    storeSettings?: StoreSettings | null;
    onProfileCreated?: () => void;
}

export function InvitationModal({
    open,
    onOpenChange,
    uninvitedProfiles,
    roles,
    pagePermissions,
    storeId,
    storeSettings,
    onProfileCreated,
}: InvitationModalProps) {
    const [inviteMethod, setInviteMethod] = useState<InviteMethod>("select");
    const [step, setStep] = useState<"form" | "result">("form");
    const [loading, setLoading] = useState(false);
    const [selectedProfileId, setSelectedProfileId] = useState<string>("");
    const [selectedRoleId, setSelectedRoleId] = useState<string>("none");
    const [expiresInDays, setExpiresInDays] = useState<string>("7");
    const [password, setPassword] = useState<string>("");
    const [usePassword, setUsePassword] = useState(false);
    const [inviteUrl, setInviteUrl] = useState("");
    const [copied, setCopied] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [showCreateProfile, setShowCreateProfile] = useState(false);
    const [showProfileSelector, setShowProfileSelector] = useState(false);
    const [targetType, setTargetType] = useState<"staff" | "cast">("cast");
    const [profileSearchQuery, setProfileSearchQuery] = useState("");

    // Settings state
    const [allowJoinByUrl, setAllowJoinByUrl] = useState(storeSettings?.allow_join_by_url ?? false);
    const [allowJoinByCode, setAllowJoinByCode] = useState(storeSettings?.allow_join_by_code ?? false);
    const [isSaving, setIsSaving] = useState(false);

    const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${storeId}` : "";

    // Save settings when toggled
    const handleToggleUrl = async (checked: boolean) => {
        setAllowJoinByUrl(checked);
        setIsSaving(true);
        await updateJoinRequestSettings({
            allowJoinRequests: true,
            allowJoinByCode,
            allowJoinByUrl: checked,
        });
        setIsSaving(false);
    };

    const handleToggleCode = async (checked: boolean) => {
        setAllowJoinByCode(checked);
        setIsSaving(true);
        await updateJoinRequestSettings({
            allowJoinRequests: true,
            allowJoinByCode: checked,
            allowJoinByUrl,
        });
        setIsSaving(false);
    };

    // Filter profiles based on targetType and sort by kana
    const filteredProfiles = uninvitedProfiles
        .filter(profile => profile.role === targetType)
        .sort((a, b) => {
            const kanaA = a.display_name_kana || a.display_name || "";
            const kanaB = b.display_name_kana || b.display_name || "";
            return kanaA.localeCompare(kanaB, "ja");
        });

    // Filter profiles for selector modal with search
    const searchFilteredProfiles = filteredProfiles.filter(profile => {
        if (!profileSearchQuery.trim()) return true;
        const query = profileSearchQuery.toLowerCase();
        return (
            profile.display_name.toLowerCase().includes(query) ||
            (profile.display_name_kana?.toLowerCase().includes(query) ?? false)
        );
    });

    // Get selected profile
    const selectedProfile = uninvitedProfiles.find(p => p.id === selectedProfileId);

    // Filter roles based on targetType
    // If targetType is 'cast', show roles with target='cast'
    // If targetType is 'staff', show roles with target='staff' or undefined (assuming general roles are for staff)
    const filteredRoles = roles.filter(role => {
        const target = role.permissions?.target;
        if (targetType === 'cast') {
            return target === 'cast';
        } else {
            return target !== 'cast'; // Show staff roles and generic roles for staff
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProfileId) return;

        setLoading(true);
        try {
            const result = await createInvitation({
                profileId: selectedProfileId,
                roleId: selectedRoleId === "none" ? undefined : selectedRoleId,
                expiresInDays: parseInt(expiresInDays),
                password: usePassword ? password : undefined,
            });

            if (result.success && result.invitation) {
                const url = `${window.location.origin}/invite/${result.invitation.token}`;
                setInviteUrl(url);
                setStep("result");
            }
        } catch (error) {
            console.error(error);
            toast({ title: "招待の作成に失敗しました", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        onOpenChange(false);
        // Reset state after close
        setTimeout(() => {
            setInviteMethod("select");
            setStep("form");
            setSelectedProfileId("");
            setSelectedRoleId("none");
            setExpiresInDays("7");
            setPassword("");
            setUsePassword(false);
            setInviteUrl("");
            setTargetType("cast");
            setCopied(false);
            setCopiedCode(false);
            setProfileSearchQuery("");
        }, 300);
    };

    const handleBack = () => {
        if (step === "result") {
            setStep("form");
        } else {
            setInviteMethod("select");
        }
    };

    const handleCopyCode = () => {
        if (storeId) {
            navigator.clipboard.writeText(storeId);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        }
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(joinUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareToLine = (text: string) => {
        window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank');
    };

    const getTitle = () => {
        if (step === "result") return "招待リンクを作成しました";
        switch (inviteMethod) {
            case "select": return "招待方法を選択";
            case "profile": return "プロフィールから招待";
            case "url": return "URLで招待";
            case "code": return "店舗コードで招待";
            default: return "招待";
        }
    };

    return (
        <>
            <Dialog open={open && !showCreateProfile} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-md w-[95%] max-h-[90vh] flex flex-col overflow-hidden !rounded-2xl bg-white dark:bg-gray-900 !p-0">
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={inviteMethod === "select" ? handleClose : handleBack}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {getTitle()}
                        </DialogTitle>
                        <div className="w-8 h-8" />
                    </DialogHeader>

                    {/* Method Selection */}
                    {inviteMethod === "select" && (
                        <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2 mb-4">
                                招待方法を選択してください
                            </p>
                            <button
                                type="button"
                                onClick={() => setInviteMethod("profile")}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                            >
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">プロフィールから招待</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">既存のプロフィールに紐づけて招待</div>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setInviteMethod("url")}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                            >
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <Link2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">URLで招待</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">参加URLを共有して新規登録してもらう</div>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setInviteMethod("code")}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                            >
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                    <Hash className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">店舗コードで招待</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">店舗コードを入力して参加申請してもらう</div>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* URL Invite */}
                    {inviteMethod === "url" && (
                        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                            {/* Enable/Disable Toggle */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">URLからの参加を許可</Label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">オフにすると新規申請を受け付けません</p>
                                </div>
                                <Switch
                                    checked={allowJoinByUrl}
                                    onCheckedChange={handleToggleUrl}
                                    disabled={isSaving}
                                />
                            </div>

                            {allowJoinByUrl ? (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">参加URL</Label>
                                        <div className="flex items-center space-x-2">
                                            <Input readOnly value={joinUrl} className="font-mono text-xs" />
                                            <Button type="button" size="icon" variant="outline" onClick={handleCopyUrl}>
                                                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-5 w-5" />}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex justify-center">
                                        <Image
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(joinUrl)}`}
                                            alt="参加QRコード"
                                            className="border p-2"
                                            width={150}
                                            height={150}
                                            unoptimized
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        className="w-full bg-[#06C755] hover:bg-[#05b54b] text-white"
                                        onClick={() => shareToLine(`参加URLをお送りします。\n${joinUrl}`)}
                                    >
                                        LINEで送る
                                    </Button>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                        URLからの参加には管理者の承認が必要です
                                    </p>
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <p className="text-sm">URLからの参加は現在無効です</p>
                                    <p className="text-xs mt-1">上のスイッチをオンにして有効化してください</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Code Invite */}
                    {inviteMethod === "code" && (
                        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                            {/* Enable/Disable Toggle */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">店舗コードからの参加を許可</Label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">オフにすると新規申請を受け付けません</p>
                                </div>
                                <Switch
                                    checked={allowJoinByCode}
                                    onCheckedChange={handleToggleCode}
                                    disabled={isSaving}
                                />
                            </div>

                            {allowJoinByCode ? (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">店舗コード</Label>
                                        <div className="flex items-center space-x-2">
                                            <Input readOnly value={storeId || ""} className="font-mono text-sm" />
                                            <Button type="button" size="icon" variant="outline" onClick={handleCopyCode}>
                                                {copiedCode ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-5 w-5" />}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">参加方法</p>
                                        <ol className="text-sm text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
                                            <li>アプリにログイン</li>
                                            <li>マイページから「店舗に参加」を選択</li>
                                            <li>店舗コードを入力して申請</li>
                                        </ol>
                                    </div>
                                    <Button
                                        type="button"
                                        className="w-full bg-[#06C755] hover:bg-[#05b54b] text-white"
                                        onClick={() => shareToLine(`店舗コードをお送りします。\n${storeId}`)}
                                    >
                                        LINEで送る
                                    </Button>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                        店舗コードからの参加には管理者の承認が必要です
                                    </p>
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <p className="text-sm">店舗コードからの参加は現在無効です</p>
                                    <p className="text-xs mt-1">上のスイッチをオンにして有効化してください</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Profile Invite Form */}
                    {inviteMethod === "profile" && step === "form" && (
                        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
                                招待するプロフィールと条件を設定してください
                            </p>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">プロフィール選択</Label>
                                <button
                                    type="button"
                                    onClick={() => setShowProfileSelector(true)}
                                    className="w-full flex items-center justify-between h-10 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <span className={selectedProfile ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}>
                                        {selectedProfile ? selectedProfile.display_name : "プロフィールを選択"}
                                    </span>
                                    <ChevronLeft className="h-4 w-4 text-gray-400 rotate-[-90deg]" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">付与するロール</Label>
                                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="ロールを選択 (なし)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">なし</SelectItem>
                                        {filteredRoles.map((role) => (
                                            <SelectItem key={role.id} value={role.id}>
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">有効期限</Label>
                                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="有効期限を選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1日</SelectItem>
                                        <SelectItem value="3">3日</SelectItem>
                                        <SelectItem value="7">1週間</SelectItem>
                                        <SelectItem value="30">30日</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="use-password"
                                        checked={usePassword}
                                        onCheckedChange={(checked) => setUsePassword(checked as boolean)}
                                    />
                                    <Label htmlFor="use-password" className="text-sm font-medium text-gray-700 dark:text-gray-200">パスワードを設定する</Label>
                                </div>
                                {usePassword && (
                                    <Input
                                        type="password"
                                        placeholder="パスワードを入力"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required={usePassword}
                                    />
                                )}
                            </div>

                            <DialogFooter className="pt-4 gap-2">
                                <Button type="button" variant="outline" onClick={handleClose}>
                                    キャンセル
                                </Button>
                                <Button type="submit" disabled={loading || !selectedProfileId}>
                                    {loading ? "作成中..." : "招待リンクを作成"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}

                    {/* Profile Invite Result */}
                    {inviteMethod === "profile" && step === "result" && (
                        <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
                                以下のリンクをユーザーに共有してください
                            </p>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">招待リンク</Label>
                                <div className="flex items-center space-x-2">
                                    <Input readOnly value={inviteUrl} className="font-mono text-sm" />
                                    <Button type="button" size="icon" variant="outline" onClick={handleCopy}>
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <Image
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(inviteUrl)}`}
                                    alt="招待QRコード"
                                    className="border p-2"
                                    width={150}
                                    height={150}
                                    unoptimized
                                />
                            </div>

                            <div className="space-y-2">
                                <Button
                                    type="button"
                                    className="w-full bg-[#06C755] hover:bg-[#05b54b] text-white"
                                    onClick={() => shareToLine(`招待リンクをお送りします。\n${inviteUrl}`)}
                                >
                                    LINEで送る
                                </Button>
                                <Button type="button" variant="outline" className="w-full" onClick={handleClose}>
                                    閉じる
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <UserEditModal
                open={showCreateProfile}
                onOpenChange={setShowCreateProfile}
                profile={null}
                isNested={true}
                hidePersonalInfo={!pagePermissions?.personalInfo}
                pagePermissions={pagePermissions}
                canEdit={true}
                onCreated={() => {
                    onProfileCreated?.();
                }}
            />

            {/* Profile Selector Modal */}
            <Dialog open={showProfileSelector} onOpenChange={setShowProfileSelector}>
                <DialogContent className="sm:max-w-md w-[95%] max-h-[80vh] flex flex-col overflow-hidden !rounded-2xl bg-white dark:bg-gray-900 !p-0">
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={() => setShowProfileSelector(false)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="閉じる"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                            プロフィールを選択
                        </DialogTitle>
                        <button
                            type="button"
                            onClick={() => {
                                setShowProfileSelector(false);
                                setShowCreateProfile(true);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 transition-colors"
                            aria-label="新規作成"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    </DialogHeader>

                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 space-y-3">
                        {/* Cast/Staff Filter Tabs */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setTargetType("cast")}
                                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                                    targetType === "cast"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                                }`}
                            >
                                キャスト
                            </button>
                            <button
                                type="button"
                                onClick={() => setTargetType("staff")}
                                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                                    targetType === "staff"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                                }`}
                            >
                                スタッフ
                            </button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="名前で検索..."
                                value={profileSearchQuery}
                                onChange={(e) => setProfileSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {searchFilteredProfiles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                                <p className="text-sm">
                                    {profileSearchQuery
                                        ? "該当するプロフィールが見つかりません"
                                        : "招待可能なプロフィールがありません"}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {searchFilteredProfiles.map((profile) => (
                                    <button
                                        key={profile.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedProfileId(profile.id);
                                            setShowProfileSelector(false);
                                            setProfileSearchQuery("");
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                            selectedProfileId === profile.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                                        }`}
                                    >
                                        {profile.avatar_url ? (
                                            <Image
                                                src={profile.avatar_url}
                                                alt={profile.display_name}
                                                width={40}
                                                height={40}
                                                className="rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                                    {profile.display_name.charAt(0)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {profile.display_name}
                                            </p>
                                            {profile.display_name_kana && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {profile.display_name_kana}
                                                </p>
                                            )}
                                        </div>
                                        {selectedProfileId === profile.id && (
                                            <Check className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

