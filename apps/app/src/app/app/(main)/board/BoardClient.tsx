"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, User, Heart, Search, Tag, MessageSquare, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatJSTDateTime } from "@/lib/utils";
import { type StorePost, type StoreManual, type ManualTag } from "./actions";
import { PostDetailModal } from "./PostDetailModal";
import { ManualDetailModal } from "./ManualDetailModal";
import { VercelTabs } from "@/components/ui/vercel-tabs";

type MainTabKey = "posts" | "manuals";

const MAIN_TABS: { key: MainTabKey; label: string; icon: React.ReactNode }[] = [
    { key: "posts", label: "掲示板", icon: <MessageSquare className="h-4 w-4" /> },
    { key: "manuals", label: "マニュアル", icon: <BookOpen className="h-4 w-4" /> },
];

// BlockNoteのコンテンツからテキストを抽出する関数
function extractTextFromContent(content: any[]): string {
    if (!content || !Array.isArray(content)) return "";

    const extractText = (blocks: any[]): string => {
        return blocks.map(block => {
            let text = "";

            if (block.content && Array.isArray(block.content)) {
                text += block.content.map((item: any) => {
                    if (item.type === "text") {
                        return item.text || "";
                    }
                    return "";
                }).join("");
            }

            if (block.children && Array.isArray(block.children)) {
                text += " " + extractText(block.children);
            }

            return text;
        }).join(" ").trim();
    };

    return extractText(content);
}

interface BoardClientProps {
    posts: StorePost[];
    manuals: StoreManual[];
    manualTags: ManualTag[];
    storeId: string;
    isStaff: boolean;
    userRole: string;
    postLikeCounts: Record<string, number>;
    postReadStatus: Record<string, boolean>;
    manualLikeCounts: Record<string, number>;
    manualReadStatus: Record<string, boolean>;
    canEdit?: boolean;
}

export function BoardClient({
    posts,
    manuals,
    manualTags,
    storeId,
    isStaff,
    userRole,
    postLikeCounts,
    postReadStatus,
    manualLikeCounts,
    manualReadStatus,
    canEdit = false,
}: BoardClientProps) {
    const router = useRouter();
    const [mainTab, setMainTab] = useState<MainTabKey>("posts");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

    // Modals
    const [viewingPost, setViewingPost] = useState<StorePost | null>(null);
    const [viewingManual, setViewingManual] = useState<StoreManual | null>(null);

    // Local read status
    const [localPostReadStatus, setLocalPostReadStatus] = useState<Record<string, boolean>>(postReadStatus);
    const [localManualReadStatus, setLocalManualReadStatus] = useState<Record<string, boolean>>(manualReadStatus);

    // 未読数を計算
    const unreadPostsCount = posts.filter(p => p.status === "published" && !localPostReadStatus[p.id]).length;
    const unreadManualsCount = manuals.filter(m => m.status === "published" && !localManualReadStatus[m.id]).length;

    // フィルター処理（スタッフは下書きも含めてすべて表示）
    let filteredPosts = isStaff ? posts : posts.filter(p => p.status === "published");
    let filteredManuals = isStaff ? manuals : manuals.filter(m => m.status === "published");

    // 検索フィルター
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredPosts = filteredPosts.filter(p => p.title.toLowerCase().includes(query));
        filteredManuals = filteredManuals.filter(m => m.title.toLowerCase().includes(query));
    }

    // タグフィルター（マニュアルのみ）
    if (selectedTagId && mainTab === "manuals") {
        filteredManuals = filteredManuals.filter(m =>
            m.tags?.some(t => t.id === selectedTagId)
        );
    }

    const handlePostClick = (post: StorePost) => {
        setViewingPost(post);
        setLocalPostReadStatus(prev => ({ ...prev, [post.id]: true }));
    };

    const handleManualClick = (manual: StoreManual) => {
        setViewingManual(manual);
        setLocalManualReadStatus(prev => ({ ...prev, [manual.id]: true }));
    };

    const handleAddClick = () => {
        if (mainTab === "posts") {
            router.push("/app/board/new");
        } else {
            router.push("/app/board/manual/new");
        }
    };

    const tabs = MAIN_TABS.map((tab) => {
        const unreadCount = tab.key === "posts" ? unreadPostsCount : unreadManualsCount;
        return {
            key: tab.key,
            label: tab.label,
            badge: unreadCount > 0 ? (
                <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {unreadCount}
                </span>
            ) : undefined,
        };
    });

    return (
        <div className="space-y-2">
            {/* Search and Plus button */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="タイトルで検索"
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 rounded-full border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    />
                </div>
                {isStaff && canEdit && (
                    <Button
                        size="icon"
                        className="h-10 w-10 shrink-0 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                        onClick={handleAddClick}
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Tabs (掲示板 / マニュアル) */}
            <VercelTabs
                tabs={tabs}
                value={mainTab}
                onChange={(val) => {
                    setMainTab(val as MainTabKey);
                    setSearchQuery("");
                    setSelectedTagId(null);
                }}
                className=""
            />

            {/* Tag filter (manuals only) */}
            {mainTab === "manuals" && manualTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setSelectedTagId(null)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            selectedTagId === null
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                    >
                        すべて
                    </button>
                    {manualTags.map((tag) => (
                        <button
                            key={tag.id}
                            type="button"
                            onClick={() => setSelectedTagId(tag.id)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                selectedTagId === tag.id
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                        >
                            <Tag className="h-3 w-3" />
                            {tag.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Content cards */}
            <div className="space-y-3">
                {mainTab === "posts" ? (
                    // 掲示板コンテンツ
                    filteredPosts.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center">
                            <p className="text-gray-500 dark:text-gray-400">
                                投稿がありません
                            </p>
                        </div>
                    ) : (
                        filteredPosts.map((post) => {
                            const contentPreview = extractTextFromContent(post.content);
                            return (
                                <button
                                    key={post.id}
                                    type="button"
                                    onClick={() => handlePostClick(post)}
                                    className={`w-full text-left rounded-2xl border p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors ${
                                        !localPostReadStatus[post.id] && post.status === "published"
                                            ? "border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
                                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {post.status === "draft" && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                下書き
                                            </span>
                                        )}
                                        {!localPostReadStatus[post.id] && post.status === "published" && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                未読
                                            </span>
                                        )}
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                                            {post.title}
                                        </h3>
                                    </div>

                                    {contentPreview && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                                            {contentPreview}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            {post.creator?.avatar_url ? (
                                                <img
                                                    src={post.creator.avatar_url}
                                                    alt=""
                                                    className="h-4 w-4 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-4 w-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                    <User className="h-2.5 w-2.5 text-gray-400" />
                                                </div>
                                            )}
                                            {post.creator?.display_name && (
                                                <span>{post.creator.display_name}</span>
                                            )}
                                            <span>
                                                {post.published_at
                                                    ? formatJSTDateTime(post.published_at)
                                                    : formatJSTDateTime(post.created_at)}
                                            </span>
                                        </div>
                                        {(postLikeCounts[post.id] || 0) > 0 && (
                                            <div className="flex items-center gap-1 text-pink-500">
                                                <Heart className="h-3.5 w-3.5 fill-current" />
                                                <span>{postLikeCounts[post.id]}</span>
                                            </div>
                                        )}
                                    </div>

                                    {isStaff && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {post.visibility.map((v) => (
                                                <span
                                                    key={v}
                                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                                >
                                                    {v === "staff" && "スタッフ"}
                                                    {v === "cast" && "キャスト"}
                                                    {v === "partner" && "パートナー"}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </button>
                            );
                        })
                    )
                ) : (
                    // マニュアルコンテンツ
                    filteredManuals.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center">
                            <p className="text-gray-500 dark:text-gray-400">
                                マニュアルがありません
                            </p>
                        </div>
                    ) : (
                        filteredManuals.map((manual) => {
                            const contentPreview = extractTextFromContent(manual.content);
                            return (
                                <button
                                    key={manual.id}
                                    type="button"
                                    onClick={() => handleManualClick(manual)}
                                    className={`w-full text-left rounded-2xl border p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors ${
                                        !localManualReadStatus[manual.id] && manual.status === "published"
                                            ? "border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
                                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {manual.status === "draft" && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                下書き
                                            </span>
                                        )}
                                        {!localManualReadStatus[manual.id] && manual.status === "published" && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                未読
                                            </span>
                                        )}
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                                            {manual.title}
                                        </h3>
                                    </div>

                                    {/* タグ */}
                                    {manual.tags && manual.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {manual.tags.map((tag) => (
                                                <span
                                                    key={tag.id}
                                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                                >
                                                    <Tag className="h-2.5 w-2.5" />
                                                    {tag.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {contentPreview && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                                            {contentPreview}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            {manual.creator?.avatar_url ? (
                                                <img
                                                    src={manual.creator.avatar_url}
                                                    alt=""
                                                    className="h-4 w-4 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-4 w-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                    <User className="h-2.5 w-2.5 text-gray-400" />
                                                </div>
                                            )}
                                            {manual.creator?.display_name && (
                                                <span>{manual.creator.display_name}</span>
                                            )}
                                            <span>{formatJSTDateTime(manual.updated_at)}</span>
                                        </div>
                                        {(manualLikeCounts[manual.id] || 0) > 0 && (
                                            <div className="flex items-center gap-1 text-pink-500">
                                                <Heart className="h-3.5 w-3.5 fill-current" />
                                                <span>{manualLikeCounts[manual.id]}</span>
                                            </div>
                                        )}
                                    </div>

                                    {isStaff && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {manual.visibility.map((v) => (
                                                <span
                                                    key={v}
                                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                                >
                                                    {v === "staff" && "スタッフ"}
                                                    {v === "cast" && "キャスト"}
                                                    {v === "partner" && "パートナー"}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </button>
                            );
                        })
                    )
                )}
            </div>

            {/* Post Detail Modal */}
            <PostDetailModal
                isOpen={!!viewingPost}
                onClose={() => setViewingPost(null)}
                post={viewingPost}
                isStaff={isStaff}
            />

            {/* Manual Detail Modal */}
            <ManualDetailModal
                isOpen={!!viewingManual}
                onClose={() => setViewingManual(null)}
                manual={viewingManual}
                isStaff={isStaff}
            />
        </div>
    );
}
