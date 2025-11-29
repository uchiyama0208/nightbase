"use client";

import { useState, useEffect } from "react";
import { LineRegistrationModal } from "./line-registration-modal";

interface LineRegistrationPromptProps {
    hasLineId: boolean;
    storeName?: string;
}

export function LineRegistrationPrompt({ hasLineId, storeName }: LineRegistrationPromptProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Check if user has dismissed the modal in this session
        const dismissed = sessionStorage.getItem("line-registration-dismissed");
        if (dismissed) {
            setIsDismissed(true);
            return;
        }

        // Show modal after a short delay if user doesn't have LINE ID
        if (!hasLineId && !isDismissed) {
            const timer = setTimeout(() => {
                setIsModalOpen(true);
            }, 2000); // Show after 2 seconds

            return () => clearTimeout(timer);
        }
    }, [hasLineId, isDismissed]);

    const handleClose = () => {
        setIsModalOpen(false);
        setIsDismissed(true);
        sessionStorage.setItem("line-registration-dismissed", "true");
    };

    if (hasLineId || isDismissed) {
        return null;
    }

    return (
        <LineRegistrationModal
            isOpen={isModalOpen}
            onClose={handleClose}
            storeName={storeName}
        />
    );
}
