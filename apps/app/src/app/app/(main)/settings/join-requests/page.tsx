"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { JoinRequestsTable } from "../../invitations/join-requests-table";
import { getJoinRequestsData, updateJoinRequestSettings } from "../../invitations/actions";
import { Button } from "@/components/ui/button";
import { Hash, Link as LinkIcon, Copy, Check, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface StoreSettings {
    id: string;
    allow_join_requests: boolean;
    allow_join_by_code: boolean;
    allow_join_by_url: boolean;
}

export default function JoinRequestsPage() {
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Settings state
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [allowJoinByCode, setAllowJoinByCode] = useState(false);
    const [allowJoinByUrl, setAllowJoinByUrl] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [storeId, setStoreId] = useState<string>("");
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const result = await getJoinRequestsData();
                if (result.redirect) {
                    router.push(result.redirect);
                    return;
                }
                setData(result.data);

                // Set initial settings from store data
                if (result.data?.store) {
                    const store = result.data.store as StoreSettings;
                    setStoreId(store.id);
                    setAllowJoinByCode(store.allow_join_by_code ?? false);
                    setAllowJoinByUrl(store.allow_join_by_url ?? false);
                }
            } catch (err: any) {
                console.error("Failed to fetch join requests data", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [router]);

    const getJoinUrl = () => {
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        return `${baseUrl}/join/${storeId}`;
    };

    const copyToClipboard = async (text: string, type: "code" | "url") => {
        try {
            await navigator.clipboard.writeText(text);
            if (type === "code") {
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
            } else {
                setCopiedUrl(true);
                setTimeout(() => setCopiedUrl(false), 2000);
            }
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    // Auto-save when settings change
    const isInitialMount = useRef(true);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Skip the initial mount
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        // Debounce the save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            setIsSaving(true);
            await updateJoinRequestSettings({
                allowJoinRequests: true,
                allowJoinByCode,
                allowJoinByUrl,
            });
            setIsSaving(false);
        }, 300);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [allowJoinByCode, allowJoinByUrl]);

    const shareToLine = () => {
        const url = getJoinUrl();
        const message = `参加URLをお送りします。\n${url}`;
        window.open(`https://line.me/R/msg/text/?${encodeURIComponent(message)}`, '_blank');
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        );
    }

    if (error) {
        return <div className="space-y-2">Error loading join requests: {error}</div>;
    }

    if (!data) return null;

    const { joinRequests } = data;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight">参加申請</h1>
                <p className="text-muted-foreground">
                    スタッフやキャストからの参加申請を管理します。
                </p>
            </div>

            <JoinRequestsTable
                requests={joinRequests}
                onSettingsClick={() => setShowSettingsModal(true)}
            />

            {/* Settings Modal */}
            <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">
                            参加申請の設定
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                            参加申請の受付方法を設定します。
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Allow by Code */}
                        <div className="space-y-3">
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                    <Hash className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="allow-code" className="text-base font-medium text-gray-900 dark:text-white">
                                            店舗コードからの参加
                                        </Label>
                                        <Switch
                                            id="allow-code"
                                            checked={allowJoinByCode}
                                            onCheckedChange={setAllowJoinByCode}
                                        />
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        ユーザーが店舗コードを入力して参加申請を送ることができます。
                                    </p>
                                </div>
                            </div>
                            {allowJoinByCode && storeId && (
                                <div className="ml-12 flex items-center gap-2">
                                    <Input
                                        value={storeId}
                                        readOnly
                                        className="font-mono text-sm bg-gray-50 dark:bg-gray-800"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => copyToClipboard(storeId, "code")}
                                        className="flex-shrink-0"
                                    >
                                        {copiedCode ? (
                                            <Check className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Allow by URL */}
                        <div className="space-y-3">
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                    <LinkIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="allow-url" className="text-base font-medium text-gray-900 dark:text-white">
                                            参加URLからの参加
                                        </Label>
                                        <Switch
                                            id="allow-url"
                                            checked={allowJoinByUrl}
                                            onCheckedChange={setAllowJoinByUrl}
                                        />
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        専用URLから新規登録して参加申請を送ることができます。
                                    </p>
                                </div>
                            </div>
                            {allowJoinByUrl && storeId && (
                                <div className="ml-12 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={getJoinUrl()}
                                            readOnly
                                            className="font-mono text-xs bg-gray-50 dark:bg-gray-800"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => copyToClipboard(getJoinUrl(), "url")}
                                            className="flex-shrink-0"
                                        >
                                            {copiedUrl ? (
                                                <Check className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                    <Button
                                        type="button"
                                        className="w-full bg-[#06C755] hover:bg-[#05b54b] text-white"
                                        onClick={shareToLine}
                                    >
                                        LINEで共有
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Auto-save indicator */}
                        {isSaving && (
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                保存中...
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export const dynamic = 'force-dynamic';
