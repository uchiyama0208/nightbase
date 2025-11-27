"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";

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
}

interface UsersTableProps {
    profiles: Profile[];
    roleFilter: string;
    hidePersonalInfo?: boolean;
}

export function UsersTable({ profiles, roleFilter, hidePersonalInfo = false }: UsersTableProps) {
    const router = useRouter();
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [nameQuery, setNameQuery] = useState("");
    const [optimisticRole, setOptimisticRole] = useState(roleFilter);

    useEffect(() => {
        setOptimisticRole(roleFilter);
    }, [roleFilter]);

    const handleRoleChange = (role: string) => {
        setOptimisticRole(role);
        router.push(`/app/users?role=${role}`);
    };

    const activeFilters = [nameQuery.trim() && "名前"]
        .filter(Boolean)
        .map(String);
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

    const filteredProfiles = profiles.filter((profile) => {
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
    });

    const handleRowClick = (profile: Profile) => {
        setSelectedProfile(profile);
        setIsModalOpen(true);
    };

    const roleIndex = useMemo(() => {
        if (optimisticRole === "cast") return 0;
        if (optimisticRole === "staff") return 1;
        if (optimisticRole === "guest") return 2;
        return 0;
    }, [optimisticRole]);

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="relative inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                    <div
                        className="absolute h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-in-out"
                        style={{
                            width: "80px",
                            left: "4px",
                            transform: `translateX(calc(${roleIndex} * (80px + 0px)))`
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => handleRoleChange("cast")}
                        className={`relative z-10 w-20 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${optimisticRole === "cast" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                    >
                        キャスト
                    </button>
                    <button
                        type="button"
                        onClick={() => handleRoleChange("staff")}
                        className={`relative z-10 w-20 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${optimisticRole === "staff" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                    >
                        スタッフ
                    </button>
                    <button
                        type="button"
                        onClick={() => handleRoleChange("guest")}
                        className={`relative z-10 w-20 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${optimisticRole === "guest" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                    >
                        ゲスト
                    </button>
                </div>

                <Button
                    size="icon"
                    className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                    onClick={() => {
                        setSelectedProfile(null);
                        setIsModalOpen(true);
                    }}
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>

            <Accordion type="single" collapsible className="w-full mb-4">
                <AccordionItem
                    value="filters"
                    className="rounded-2xl border border-gray-200 bg-white px-2 dark:border-gray-700 dark:bg-gray-800"
                >
                    <AccordionTrigger className="px-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <div className="flex w-full items-center justify-between pr-2">
                            <span>フィルター</span>
                            {hasFilters && (
                                <span className="text-xs text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                                    {activeFilters.join("・")}
                                </span>
                            )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2">
                        <div className="flex flex-col gap-3 pt-2 pb-2">
                            <Input
                                placeholder="名前で検索"
                                value={nameQuery}
                                onChange={(e) => setNameQuery(e.target.value)}
                                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-xs md:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400">表示名</TableHead>
                            {(roleFilter === "cast" || roleFilter === "staff") && (
                                <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400">ひらがな</TableHead>
                            )}
                            {roleFilter === "guest" && (
                                <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400">宛名</TableHead>
                            )}
                            {roleFilter === "guest" && (
                                <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400">領収書</TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProfiles.map((profile) => (
                            <TableRow
                                key={profile.id}
                                className="cursor-pointer border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                onClick={() => handleRowClick(profile)}
                            >
                                <TableCell className="px-3 sm:px-4 text-center font-medium text-sm text-gray-900 dark:text-white truncate">
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
                                {(roleFilter === "cast" || roleFilter === "staff") && (
                                    <TableCell className="px-3 sm:px-4 text-center text-sm text-gray-500 dark:text-gray-400 truncate">
                                        {profile.display_name_kana || "-"}
                                    </TableCell>
                                )}
                                {roleFilter === "guest" && (
                                    <TableCell className="px-3 sm:px-4 text-center text-sm text-gray-900 dark:text-white truncate">
                                        {profile.guest_addressee || "-"}
                                    </TableCell>
                                )}
                                {roleFilter === "guest" && (
                                    <TableCell className="px-3 sm:px-4 text-center text-sm text-gray-900 dark:text-white truncate">
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
                        ))}
                        {filteredProfiles.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={roleFilter === "guest" ? 3 : 2} className="h-24 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                    ユーザーが見つかりません
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Modal is only loaded when isModalOpen is true */}
            {isModalOpen && (
                <UserEditModal
                    profile={selectedProfile}
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    hidePersonalInfo={hidePersonalInfo}
                />
            )}
        </>
    );
}
