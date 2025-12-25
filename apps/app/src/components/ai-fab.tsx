"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import dynamic from "next/dynamic";

// Lazy load the modal
const AIChatModal = dynamic(
    () => import("./ai-chat-modal").then((mod) => ({ default: mod.AIChatModal })),
    { loading: () => null, ssr: false }
);

interface AIFabProps {
    className?: string;
}

export function AIFab({ className }: AIFabProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-[72px] right-4 lg:bottom-4 z-50 h-11 w-11 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md hover:shadow-xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center ${className || ""}`}
                aria-label="AIアシスタントを開く"
            >
                <Sparkles className="h-5 w-5" />
            </button>

            <AIChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
