"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useChat, type Message } from "ai/react";
import { X, Send, Sparkles, Loader2, Mic, MicOff } from "lucide-react";
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
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        setMessages,
        append,
    } = useChat({
        api: "/api/ai/chat",
    });

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
            });

            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());

                if (audioChunksRef.current.length === 0) return;

                const audioBlob = new Blob(audioChunksRef.current, {
                    type: mediaRecorder.mimeType,
                });

                // Send to transcription API
                await transcribeAudio(audioBlob);
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Failed to start recording:", error);
            alert("マイクへのアクセスが許可されていません");
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, []);

    const toggleRecording = useCallback(() => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }, [isRecording, startRecording, stopRecording]);

    const transcribeAudio = async (audioBlob: Blob) => {
        setIsTranscribing(true);
        try {
            const formData = new FormData();
            const extension = audioBlob.type.includes("webm") ? "webm" : "mp4";
            formData.append("audio", audioBlob, `recording.${extension}`);

            const response = await fetch("/api/ai/transcribe", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Transcription failed");
            }

            const { text } = await response.json();
            if (text) {
                // 自動送信
                append({
                    role: "user",
                    content: text,
                });
            }
        } catch (error) {
            console.error("Transcription error:", error);
            alert("音声認識に失敗しました");
        } finally {
            setIsTranscribing(false);
        }
    };

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
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
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
                            {messages
                                .filter((message: Message) => message.content && message.content.trim() !== "")
                                .map((message: Message) => (
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
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="icon"
                            onClick={toggleRecording}
                            disabled={isLoading || isTranscribing}
                            className={cn(
                                "h-12 w-12 flex-shrink-0 rounded-full transition-all",
                                isRecording
                                    ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                                    : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                            )}
                        >
                            {isTranscribing ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : isRecording ? (
                                <MicOff className="h-5 w-5" />
                            ) : (
                                <Mic className="h-5 w-5" />
                            )}
                        </Button>
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={isRecording ? "録音中..." : isTranscribing ? "変換中..." : "質問を入力..."}
                            rows={1}
                            disabled={isRecording || isTranscribing}
                            className="flex-1 resize-none rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                            style={{
                                minHeight: "48px",
                                maxHeight: "120px",
                            }}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!input.trim() || isLoading || isRecording || isTranscribing}
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
