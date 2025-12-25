"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
    fallbackHref?: string;
}

export function BackButton({ fallbackHref }: BackButtonProps) {
    const router = useRouter();

    const handleClick = () => {
        // Check if there's history to go back to
        if (window.history.length > 1) {
            router.back();
        } else if (fallbackHref) {
            router.push(fallbackHref);
        } else {
            router.push("/app/dashboard");
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
            <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </button>
    );
}
