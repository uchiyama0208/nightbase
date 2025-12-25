"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Filter, Settings, X, ChevronLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { VercelTabs } from "@/components/ui/vercel-tabs";

// Lazy load the modal - only when user clicks
const UserEditModal = dynamic(() => import("./user-edit-modal").then(mod => ({ default: mod.UserEditModal })), {
    loading: () => null,
    ssr: false
});

interface Profile {
    id: string;
    display_name: string | null;
    display_name_kana: string | null;
    real_name: string | null;
    real_name_kana: string | null;
    role: string;
    store_id: string;
    guest_addressee?: string | null;
    guest_receipt_type?: string | null;
    stores?: { name: string } | null;
    avatar_url?: string | null;
    status?: string | null;
    phone_number?: string | null;
    prefecture?: string | null;
    city?: string | null;
    street?: string | null;
}

interface PagePermissions {
    bottles: boolean;
    resumes: boolean;
    salarySystems: boolean;
    attendance: boolean;
    personalInfo: boolean;
}

interface UsersTableProps {
    profiles: Profile[];
    roleFilter: string;
    hidePersonalInfo?: boolean;
    canEdit?: boolean;
    pagePermissions?: PagePermissions;
}

export function UsersTable({ profiles: initialProfiles, roleFilter, hidePersonalInfo = false, canEdit = false, pagePermissions }: UsersTableProps) {
    const router = useRouter();
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [nameQuery, setNameQuery] = useState("");
    const [optimisticRole, setOptimisticRole] = useState(roleFilter);
    const [profiles, setProfiles] = useState(initialProfiles);

    // Sync profiles when initialProfiles changes
    useEffect(() => {
        setProfiles(initialProfiles);
    }, [initialProfiles]);

    const handleDeleteProfile = useCallback((profileId: string) => {
        // Optimistically remove from list
        setProfiles(prev => prev.filter(p => p.id !== profileId));
    }, []);

    const handleUpdateProfile = useCallback((updatedProfile: Partial<Profile> & { id: string }) => {
        // Optimistically update in list
        setProfiles(prev => prev.map(p =>
            p.id === updatedProfile.id ? { ...p, ...updatedProfile } : p
        ));
    }, []);

    useEffect(() => {
        setOptimisticRole(roleFilter);
    }, [roleFilter]);

    const handleRoleChange = useCallback((role: string) => {
        setOptimisticRole(role);
        router.push(`/app/users?role=${role}`);
    }, [router]);

    const activeFilters = useMemo(() => [nameQuery.trim() && "名前"]
        .filter(Boolean)
        .map(String), [nameQuery]);
    const hasFilters = activeFilters.length > 0;

    const nameSuggestions = useMemo(
        () =>
            Array.from(
                new Set(
                    profiles
                        .filter((profile) => {
                            if (optimisticRole === "staff") {
                                return ["staff", "admin"].includes(profile.role);
                            }
                            return profile.role === optimisticRole;
                        })
                        .map((profile) =>
                            profile.display_name ||
                            profile.display_name_kana ||
                            profile.real_name ||
                            profile.real_name_kana ||
                            profile.guest_addressee ||
                            profile.guest_receipt_type ||
                            "",
                        )
                        .filter(Boolean),
                ),
            ),
        [profiles, optimisticRole],
    );

    const filteredProfiles = useMemo(() => profiles
        .filter((profile) => {
            // Role filtering
            let roleMatch = false;
            if (optimisticRole === "staff") {
                roleMatch = ["staff", "admin"].includes(profile.role);
            } else {
                roleMatch = profile.role === optimisticRole;
            }
            if (!roleMatch) return false;

            // Name filtering
            if (!nameQuery.trim()) return true;
            const term = nameQuery.trim().toLowerCase();
            const target = (
                profile.display_name ||
                profile.display_name_kana ||
                profile.real_name ||
                profile.real_name_kana ||
                profile.guest_addressee ||
                profile.guest_receipt_type ||
                ""
            ).toLowerCase();
            return target.includes(term);
        })
        .sort((a, b) => {
            // Sort by display_name_kana (hiragana) in 50音順
            const aKana = (a.display_name_kana || a.display_name || "").toLowerCase();
            const bKana = (b.display_name_kana || b.display_name || "").toLowerCase();
            return aKana.localeCompare(bKana, "ja");
        }), [profiles, optimisticRole, nameQuery]);

    const handleRowClick = useCallback((profile: Profile) => {
        setSelectedProfile(profile);
        setIsModalOpen(true);
    }, []);

    const tabs = [
        { key: "cast", label: "キャスト" },
        { key: "staff", label: "スタッフ" },
        { key: "guest", label: "ゲスト" },
        { key: "partner", label: "パートナー" },
    ];

    return (
        <>
            <div className="flex items-center gap-2 mb-4">
                <button
                    type="button"
                    className={`flex items-center gap-1 px-1 py-1 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        hasFilters ? "text-blue-600" : "text-gray-500 dark:text-gray-400"
                    }`}
                    onClick={() => setIsFilterOpen(true)}
                >
                    <Filter className="h-5 w-5 shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        フィルター: {hasFilters ? nameQuery : "なし"}
                    </span>
                </button>
                <div className="flex-1" />
                <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700 shadow-sm transition-all hover:scale-105 active:scale-95"
                    onClick={() => router.push("/app/settings")}
                    aria-label="設定"
                >
                    <Settings className="h-5 w-5" />
                </Button>
                {canEdit && (
                    <Button
                        size="icon"
                        className="h-10 w-10 shrink-0 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                        onClick={() => {
                            setSelectedProfile(null);
                            setIsModalOpen(true);
                        }}
                        aria-label="追加"
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Vercel-style Tab Navigation */}
            <VercelTabs
                tabs={tabs}
                value={optimisticRole}
                onChange={(val) => handleRoleChange(val)}
                className="mb-4"
            />

            <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Table className="table-fixed">
                    <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                            <TableHead className="w-1/3 text-center text-gray-900 dark:text-gray-100">表示名</TableHead>
                            {(optimisticRole === "cast" || optimisticRole === "staff") && (
                                <TableHead className="w-1/3 text-center text-gray-900 dark:text-gray-100">ひらがな</TableHead>
                            )}
                            {(optimisticRole === "cast" || optimisticRole === "staff") && (
                                <TableHead className="w-1/3 text-center text-gray-900 dark:text-gray-100">状態</TableHead>
                            )}
                            {optimisticRole === "partner" && (
                                <TableHead className="w-1/3 text-center text-gray-900 dark:text-gray-100">電話番号</TableHead>
                            )}
                            {optimisticRole === "partner" && (
                                <TableHead className="w-1/3 text-center text-gray-900 dark:text-gray-100">住所</TableHead>
                            )}
                            {optimisticRole === "guest" && (
                                <TableHead className="w-1/3 text-center text-gray-900 dark:text-gray-100">宛名</TableHead>
                            )}
                            {optimisticRole === "guest" && (
                                <TableHead className="w-1/3 text-center text-gray-900 dark:text-gray-100">領収書</TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProfiles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                    ユーザーが見つかりません
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProfiles.map((profile) => (
                                <TableRow
                                    key={profile.id}
                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    onClick={() => handleRowClick(profile)}
                                >
                                    <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                        <div className="flex items-center justify-center gap-2">
                                            {profile.avatar_url && (
                                                <Image
                                                    src={profile.avatar_url}
                                                    alt={profile.display_name || "avatar"}
                                                    width={32}
                                                    height={32}
                                                    className="h-8 w-8 rounded-full object-cover"
                                                />
                                            )}
                                            <span>{profile.display_name || "-"}</span>
                                        </div>
                                    </TableCell>
                                    {(optimisticRole === "cast" || optimisticRole === "staff") && (
                                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                            {profile.display_name_kana || "-"}
                                        </TableCell>
                                    )}
                                    {(optimisticRole === "cast" || optimisticRole === "staff") && (
                                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                            {profile.status || "在籍中"}
                                        </TableCell>
                                    )}
                                    {optimisticRole === "partner" && (
                                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                            {profile.phone_number || "-"}
                                        </TableCell>
                                    )}
                                    {optimisticRole === "partner" && (
                                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                            {profile.prefecture || profile.city || profile.street
                                                ? `${profile.prefecture || ""}${profile.city || ""}${profile.street || ""}`
                                                : "-"}
                                        </TableCell>
                                    )}
                                    {optimisticRole === "guest" && (
                                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                            {profile.guest_addressee || "-"}
                                        </TableCell>
                                    )}
                                    {optimisticRole === "guest" && (
                                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                            {profile.guest_receipt_type === "amount_only"
                                                ? "金額のみ"
                                                : profile.guest_receipt_type === "with_date"
                                                    ? "日付入り"
                                                    : profile.guest_receipt_type === "none"
                                                        ? "なし"
                                                        : "-"}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Filter Modal */}
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="flex flex-row items-center">
                        <button
                            type="button"
                            onClick={() => setIsFilterOpen(false)}
                            className="p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-gray-900 dark:text-white">
                            フィルター
                        </DialogTitle>
                        <div className="w-7" />
                    </DialogHeader>
                    <div className="flex flex-col gap-4 mt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                名前で検索
                            </label>
                            <div className="relative">
                                <Input
                                    placeholder="名前を入力..."
                                    value={nameQuery}
                                    onChange={(e) => setNameQuery(e.target.value)}
                                    className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 pr-9 text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {nameQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setNameQuery("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                                        aria-label="クリア"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <Button
                            className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => setIsFilterOpen(false)}
                        >
                            適用
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsFilterOpen(false)}
                            className="w-full"
                        >
                            戻る
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal is only loaded when isModalOpen is true */}
            {isModalOpen && (
                <UserEditModal
                    profile={selectedProfile}
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    hidePersonalInfo={hidePersonalInfo}
                    canEdit={canEdit}
                    onDelete={handleDeleteProfile}
                    onUpdate={handleUpdateProfile}
                    pagePermissions={pagePermissions}
                />
            )}
        </>
    );
}
