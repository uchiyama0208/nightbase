"use client";

import { useState, useEffect, useRef } from "react";
import { useChat, type Message } from "ai/react";
import { X, Send, Trash2, Sparkles, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIChatModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AIChatModal({ isOpen, onClose }: AIChatModalProps) {
    const [initialLoading, setInitialLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        setMessages,
    } = useChat({
        api: "/api/ai/chat",
    });

    // Load chat history on open
    useEffect(() => {
        if (isOpen) {
            loadHistory();
        }
    }, [isOpen]);

    const loadHistory = async () => {
        setInitialLoading(true);
        try {
            const res = await fetch("/api/ai/history");
            if (res.ok) {
                const data = await res.json();
                if (data.messages && data.messages.length > 0) {
                    setMessages(
                        data.messages.map((m: any) => ({
                            id: m.id,
                            role: m.role,
                            content: m.content,
                        }))
                    );
                }
            }
        } catch (error) {
            console.error("Failed to load chat history:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    const clearHistory = async () => {
        try {
            const res = await fetch("/api/ai/history", { method: "DELETE" });
            if (res.ok) {
                setMessages([]);
            }
        } catch (error) {
            console.error("Failed to clear chat history:", error);
        }
    };

    // Auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && !initialLoading) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, initialLoading]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // IME変換中は送信しない
        if (e.nativeEvent.isComposing) return;

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() && !isLoading) {
                handleSubmit(e as any);
            }
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("ja-JP", {
            timeZone: "Asia/Tokyo",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-3 flex-shrink-0 mb-0">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            AIアシスタント
                        </DialogTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        {messages.length > 0 && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 hover:text-red-500"
                                onClick={clearHistory}
                                title="履歴をクリア"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
                    {initialLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                                <Sparkles className="h-8 w-8 text-purple-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                AIアシスタントへようこそ
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                                店舗のデータに基づいて質問に答えます。
                                売上分析、出勤状況、在庫確認など何でもお聞きください。
                            </p>
                            <div className="mt-6 flex flex-wrap gap-2 justify-center">
                                {[
                                    "今日の売上は？",
                                    "出勤中のスタッフは？",
                                    "人気メニューを教えて",
                                    "今月の売上傾向は？",
                                ].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => {
                                            handleInputChange({
                                                target: { value: suggestion },
                                            } as any);
                                            setTimeout(() => inputRef.current?.focus(), 0);
                                        }}
                                        className="px-3 py-1.5 text-sm rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((message: Message) => (
                                <div
                                    key={message.id}
                                    className={cn(
                                        "flex",
                                        message.role === "user" ? "justify-end" : "justify-start"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "max-w-[80%] rounded-2xl px-4 py-2",
                                            message.role === "user"
                                                ? "bg-blue-600"
                                                : "bg-gray-100 dark:bg-gray-800"
                                        )}
                                    >
                                        <p className={cn(
                                            "whitespace-pre-wrap text-sm",
                                            message.role === "user"
                                                ? "text-white"
                                                : "text-gray-900 dark:text-white"
                                        )}>
                                            {message.content}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-gray-100 dark:bg-gray-800">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                                            <span className="text-sm text-gray-500">考え中...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="border-t px-4 py-3 flex-shrink-0">
                    <form onSubmit={handleSubmit} className="flex items-center gap-3">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="質問を入力..."
                            rows={1}
                            className="flex-1 resize-none rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            style={{
                                minHeight: "48px",
                                maxHeight: "120px",
                            }}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!input.trim() || isLoading}
                            className="h-12 w-12 flex-shrink-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Send className="h-5 w-5" />
                            )}
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
