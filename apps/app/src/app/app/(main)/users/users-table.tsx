"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
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
}

interface UsersTableProps {
    profiles: Profile[];
    roleFilter: string;
}

export function UsersTable({ profiles, roleFilter }: UsersTableProps) {
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [nameQuery, setNameQuery] = useState("");

    const activeFilters = [nameQuery.trim() && "名前"]
        .filter(Boolean)
        .map(String);
    const hasFilters = activeFilters.length > 0;

    const filteredProfiles = profiles.filter((profile) => {
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

    return (
        <>
            <div className="flex flex-col gap-3 mb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 text-xs">
                            <Link
                                href="/app/users?role=cast"
                                className={`px-4 h-full flex items-center rounded-full font-medium transition-colors ${roleFilter === "cast" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`}
                            >
                                キャスト
                            </Link>
                            <Link
                                href="/app/users?role=staff"
                                className={`px-4 h-full flex items-center rounded-full font-medium transition-colors ${roleFilter === "staff" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`}
                            >
                                スタッフ
                            </Link>
                            <Link
                                href="/app/users?role=guest"
                                className={`px-4 h-full flex items-center rounded-full font-medium transition-colors ${roleFilter === "guest" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`}
                            >
                                ゲスト
                            </Link>
                        </div>
                        <Accordion type="single" collapsible className="w-full sm:w-auto">
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
                                    <div className="grid grid-cols-1">
                                        <input
                                            type="text"
                                            placeholder="名前で検索"
                                            value={nameQuery}
                                            onChange={(e) => setNameQuery(e.target.value)}
                                            className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-xs md:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                    <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 rounded-full bg-white border-blue-500 hover:bg-blue-50 text-blue-500 shadow-sm dark:bg-gray-800 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-700"
                        onClick={() => {
                            setSelectedProfile(null);
                            setIsModalOpen(true);
                        }}
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/3">表示名</TableHead>
                            {roleFilter === "guest" && (
                                <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/3">宛名</TableHead>
                            )}
                            {roleFilter === "guest" && (
                                <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/3">領収書</TableHead>
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
                                    {profile.display_name || "-"}
                                </TableCell>
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
                                                : "なし"}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {filteredProfiles.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={roleFilter === "guest" ? 3 : 1} className="h-24 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400">
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
                />
            )}
        </>
    );
}
