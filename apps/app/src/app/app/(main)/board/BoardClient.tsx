"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, User, Tag, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatJSTDateTime } from "@/lib/utils";
import { type StorePost, type StoreManual, type ManualTag } from "./actions";
import { PostDetailModal } from "./PostDetailModal";
import { ManualDetailModal } from "./ManualDetailModal";

// BlockNoteのコンテンツからテキストを抽出する関数
function extractTextFromContent(content: any[]): string {
    if (!content || !Array.isArray(content)) return "";

    const extractText = (blocks: any[]): string => {
        return blocks.map(block => {
            let text = "";

            // content配列からテキストを抽出
            if (block.content && Array.isArray(block.content)) {
                text += block.content.map((item: any) => {
                    if (item.type === "text") {
                        return item.text || "";
                    }
                    return "";
                }).join("");
            }

            // children（ネストされたブロック）からも抽出
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
    tags: ManualTag[];
    storeId: string;
    isStaff: boolean;
    userRole: string;
    postLikeCounts: Record<string, number>;
    manualLikeCounts: Record<string, number>;
    postReadStatus: Record<string, boolean>;
    manualReadStatus: Record<string, boolean>;
}

export function BoardClient({ posts, manuals, tags, storeId, isStaff, userRole, postLikeCounts, manualLikeCounts, postReadStatus, manualReadStatus }: BoardClientProps) {
    const router = useRouter();
    const [viewingPost, setViewingPost] = useState<StorePost | null>(null);
    const [viewingManual, setViewingManual] = useState<StoreManual | null>(null);
    const [activeMainTab, setActiveMainTab] = useState<"board" | "manual">("board");
    const [activeSubTab, setActiveSubTab] = useState<"published" | "draft">("published");
    const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
    // Track read status locally for immediate UI update
    const [localPostReadStatus, setLocalPostReadStatus] = useState<Record<string, boolean>>(postReadStatus);
    const [localManualReadStatus, setLocalManualReadStatus] = useState<Record<string, boolean>>(manualReadStatus);

    // 掲示板: 投稿済みと下書きの件数
    const publishedPostCount = posts.filter(p => p.status === "published").length;
    const draftPostCount = posts.filter(p => p.status === "draft").length;

    // マニュアル: 投稿済みと下書きの件数
    const publishedManualCount = manuals.filter(m => m.status === "published").length;
    const draftManualCount = manuals.filter(m => m.status === "draft").length;

    // 掲示板フィルター
    const filteredPosts = isStaff
        ? posts.filter(p => p.status === activeSubTab)
        : posts.filter(p => p.status === "published");

    // マニュアルフィルター（タグでも絞り込み可能）
    let filteredManuals = isStaff
        ? manuals.filter(m => m.status === activeSubTab)
        : manuals.filter(m => m.status === "published");

    if (selectedTagId) {
        filteredManuals = filteredManuals.filter(m =>
            m.tags?.some(t => t.id === selectedTagId)
        );
    }

    const handlePostClick = (post: StorePost) => {
        setViewingPost(post);
        // Mark as read locally for immediate UI update
        setLocalPostReadStatus(prev => ({ ...prev, [post.id]: true }));
    };

    const handleManualClick = (manual: StoreManual) => {
        setViewingManual(manual);
        // Mark as read locally for immediate UI update
        setLocalManualReadStatus(prev => ({ ...prev, [manual.id]: true }));
    };

    const handleAddClick = () => {
        if (activeMainTab === "board") {
            router.push("/app/board/new");
        } else {
            router.push("/app/board/manual/new");
        }
    };

    return (
        <>
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {activeMainTab === "board" ? "掲示板" : "マニュアル"}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {activeMainTab === "board" ? "店舗からのお知らせ" : "業務マニュアル"}
                </p>
            </div>

            {/* Main toggle (掲示板/マニュアル) + Add button */}
            <div className="flex items-center justify-between">
                <div className="relative inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                    <div
                        className="absolute h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-in-out"
                        style={{
                            width: "100px",
                            left: "4px",
                            transform: `translateX(${activeMainTab === "board" ? "0" : "100px"})`
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setActiveMainTab("board");
                            setActiveSubTab("published");
                            setSelectedTagId(null);
                        }}
                        className={`relative z-10 w-[100px] flex items-center justify-center gap-1.5 h-8 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                            activeMainTab === "board"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                    >
                        掲示板
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveMainTab("manual");
                            setActiveSubTab("published");
                            setSelectedTagId(null);
                        }}
                        className={`relative z-10 w-[100px] flex items-center justify-center gap-1.5 h-8 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                            activeMainTab === "manual"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                    >
                        マニュアル
                    </button>
                </div>
                {isStaff && (
                    <Button
                        size="icon"
                        className="h-10 w-10 shrink-0 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                        onClick={handleAddClick}
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Sub toggle (投稿済み/下書き) - スタッフのみ表示 */}
            {isStaff && (
                <div className="flex items-center gap-3">
                    <div className="relative inline-flex h-9 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                        <div
                            className="absolute h-7 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-in-out"
                            style={{
                                width: "80px",
                                left: "4px",
                                transform: `translateX(${activeSubTab === "published" ? "0" : "80px"})`
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setActiveSubTab("published")}
                            className={`relative z-10 w-[80px] flex items-center justify-center gap-1 h-7 rounded-full text-xs font-medium whitespace-nowrap transition-colors duration-200 ${
                                activeSubTab === "published"
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            }`}
                        >
                            公開
                            <span className={`text-xs ${
                                activeSubTab === "published"
                                    ? "text-gray-600 dark:text-gray-300"
                                    : "text-gray-400 dark:text-gray-500"
                            }`}>
                                {activeMainTab === "board" ? publishedPostCount : publishedManualCount}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveSubTab("draft")}
                            className={`relative z-10 w-[80px] flex items-center justify-center gap-1 h-7 rounded-full text-xs font-medium whitespace-nowrap transition-colors duration-200 ${
                                activeSubTab === "draft"
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            }`}
                        >
                            下書き
                            <span className={`text-xs ${
                                activeSubTab === "draft"
                                    ? "text-gray-600 dark:text-gray-300"
                                    : "text-gray-400 dark:text-gray-500"
                            }`}>
                                {activeMainTab === "board" ? draftPostCount : draftManualCount}
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {/* Tag filter (マニュアルのみ) */}
            {activeMainTab === "manual" && tags.length > 0 && (
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
                    {tags.map((tag) => (
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
                {activeMainTab === "board" ? (
                    // 掲示板一覧
                    filteredPosts.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center">
                            <p className="text-gray-500 dark:text-gray-400">
                                {activeSubTab === "published" ? "投稿がありません" : "下書きがありません"}
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
                                        {!localPostReadStatus[post.id] && post.status === "published" && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                未読
                                            </span>
                                        )}
                                        {post.status === "draft" && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                下書き
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
                    // マニュアル一覧
                    filteredManuals.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center">
                            <p className="text-gray-500 dark:text-gray-400">
                                {activeSubTab === "published" ? "マニュアルがありません" : "下書きがありません"}
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
                                        {!localManualReadStatus[manual.id] && manual.status === "published" && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                未読
                                            </span>
                                        )}
                                        {manual.status === "draft" && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                下書き
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
        </>
    );
}
