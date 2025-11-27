"use client";

import { useEffect, useState } from "react";
import { Plus, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResumeModal } from "./resume-modal";
import { getResumes } from "./actions";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ResumesClientProps {
    storeId: string;
}

export function ResumesClient({ storeId }: ResumesClientProps) {
    const [resumes, setResumes] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);

    useEffect(() => {
        if (storeId) {
            loadResumes();
        }
    }, [storeId]);

    const loadResumes = async () => {
        if (!storeId) return;
        const data = await getResumes(storeId);
        setResumes(data || []);
    };

    const filteredResumes = resumes.filter((resume) => {
        const searchLower = searchQuery.toLowerCase();
        const castName = resume.desired_cast_name?.toLowerCase() || "";
        const realName = resume.profile?.real_name?.toLowerCase() || "";
        const displayName = resume.profile?.display_name?.toLowerCase() || "";

        return (
            castName.includes(searchLower) ||
            realName.includes(searchLower) ||
            displayName.includes(searchLower)
        );
    });

    const handleCreateClick = () => {
        setSelectedResumeId(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (id: string) => {
        setSelectedResumeId(id);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedResumeId(null);
        loadResumes();
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-5xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">履歴書管理</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        キャストの履歴書・面接シートを管理します
                    </p>
                </div>
                <Button onClick={handleCreateClick} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    新規作成
                </Button>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="名前、キャスト名で検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-3 font-medium">名前 / キャスト名</th>
                                <th className="px-6 py-3 font-medium">希望条件</th>
                                <th className="px-6 py-3 font-medium">作成日</th>
                                <th className="px-6 py-3 font-medium text-right">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {filteredResumes.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        履歴書が見つかりません
                                    </td>
                                </tr>
                            ) : (
                                filteredResumes.map((resume) => (
                                    <tr
                                        key={resume.id}
                                        className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                        onClick={() => handleEditClick(resume.id)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={resume.profile?.avatar_url || ""} />
                                                    <AvatarFallback>{resume.profile?.display_name?.[0] || "?"}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        {resume.profile?.real_name || "未設定"}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {resume.desired_cast_name || resume.profile?.display_name || "キャスト名未設定"}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="text-gray-900 dark:text-white">
                                                    時給: {resume.desired_hourly_wage ? `${resume.desired_hourly_wage.toLocaleString()}円` : "-"}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    シフト: {resume.desired_shift_days || "-"}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {format(new Date(resume.created_at), "yyyy/MM/dd HH:mm", { locale: ja })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="sm" onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditClick(resume.id);
                                            }}>
                                                <FileText className="h-4 w-4 mr-2" />
                                                詳細
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ResumeModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                resumeId={selectedResumeId}
                storeId={storeId}
            />
        </div>
    );
}
