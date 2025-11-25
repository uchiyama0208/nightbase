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
import { Copy, Check, X, Plus } from "lucide-react";
import { UserEditModal } from "../users/user-edit-modal";

interface Profile {
    id: string;
    display_name: string;
    role: string;
    avatar_url: string | null;
}

interface Role {
    id: string;
    name: string;
}

interface InvitationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uninvitedProfiles: Profile[];
    roles: Role[];
}

export function InvitationModal({
    open,
    onOpenChange,
    uninvitedProfiles,
    roles,
}: InvitationModalProps) {
    const [step, setStep] = useState<"form" | "result">("form");
    const [loading, setLoading] = useState(false);
    const [selectedProfileId, setSelectedProfileId] = useState<string>("");
    const [selectedRoleId, setSelectedRoleId] = useState<string>("none");
    const [expiresInDays, setExpiresInDays] = useState<string>("7");
    const [password, setPassword] = useState<string>("");
    const [usePassword, setUsePassword] = useState(false);
    const [inviteUrl, setInviteUrl] = useState("");
    const [copied, setCopied] = useState(false);
    const [showCreateProfile, setShowCreateProfile] = useState(false);

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
            alert("招待の作成に失敗しました");
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
            setStep("form");
            setSelectedProfileId("");
            setSelectedRoleId("none");
            setExpiresInDays("7");
            setPassword("");
            setUsePassword(false);
            setInviteUrl("");
        }, 300);
    };

    return (
        <>
            <Dialog open={open && !showCreateProfile} onOpenChange={handleClose}>
                <DialogContent className="max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] overflow-y-auto sm:max-w-[500px] bg-white dark:bg-gray-800 text-gray-900 dark:text-white !p-4 sm:!p-6 my-4">
                    <DialogHeader>
                        <DialogTitle className="text-black dark:text-white">{step === "form" ? "ユーザーを招待" : "招待リンクを作成しました"}</DialogTitle>
                        <DialogDescription>
                            {step === "form"
                                ? "招待するプロフィールと条件を設定してください。"
                                : "以下のリンクをユーザーに共有してください。"}
                        </DialogDescription>
                    </DialogHeader>

                    {step === "form" ? (
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>プロフィール選択</Label>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateProfile(true)}
                                        className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                                    >
                                        <Plus className="h-3 w-3" />
                                        新しいプロフィールを作成
                                    </button>
                                </div>
                                <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="招待するプロフィールを選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uninvitedProfiles.map((profile) => (
                                            <SelectItem key={profile.id} value={profile.id}>
                                                {profile.display_name} ({profile.role === "cast" ? "キャスト" : "スタッフ"})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>付与するロール (任意)</Label>
                                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="ロールを選択 (なし)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">なし (デフォルト権限)</SelectItem>
                                        {roles.map((role) => (
                                            <SelectItem key={role.id} value={role.id}>
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>有効期限</Label>
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
                                    <Label htmlFor="use-password">パスワードを設定する</Label>
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

                            <DialogFooter className="pt-4 gap-4">
                                <Button type="button" variant="outline" onClick={handleClose}>
                                    キャンセル
                                </Button>
                                <Button type="submit" disabled={loading || !selectedProfileId}>
                                    {loading ? "作成中..." : "招待リンクを作成"}
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : (
                        <div className="space-y-6 py-4">
                            <div className="space-y-2">
                                <Label>招待リンク</Label>
                                <div className="flex items-center space-x-2">
                                    <Input readOnly value={inviteUrl} className="font-mono text-sm" />
                                    <Button type="button" size="icon" variant="outline" onClick={handleCopy}>
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                {/* Simple QR Code using API */}
                                <Image
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(inviteUrl)}`}
                                    alt="招待QRコード"
                                    className="border rounded-lg p-2"
                                    width={150}
                                    height={150}
                                    unoptimized
                                />
                            </div>

                            <div className="space-y-2">
                                <Button
                                    type="button"
                                    className="w-full bg-[#06C755] hover:bg-[#05b54b] text-white"
                                    onClick={() => window.open(`https://line.me/R/msg/text/?${encodeURIComponent(`招待リンクをお送りします。\n${inviteUrl}`)}`, '_blank')}
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
            />
        </>
    );
}

