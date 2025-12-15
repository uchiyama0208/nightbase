"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface SlidePanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
    className?: string;
}

export function SlidePanel({ open, onOpenChange, children, className }: SlidePanelProps) {
    const [mounted, setMounted] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const startXRef = useRef<number | null>(null);
    const currentXRef = useRef<number>(0);
    const isDraggingRef = useRef(false);

    // Mount check for portal
    useEffect(() => {
        setMounted(true);
    }, []);

    // Handle open/close animation
    useEffect(() => {
        if (open) {
            setIsVisible(true);
            // Small delay to trigger CSS transition
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsAnimating(true);
                });
            });
            // Prevent body scroll
            document.body.style.overflow = "hidden";
        } else {
            setIsAnimating(false);
            // Wait for animation to complete before hiding
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 200);
            // Restore body scroll
            document.body.style.overflow = "";
            return () => clearTimeout(timer);
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && open) {
                onOpenChange(false);
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [open, onOpenChange]);

    // Touch/Mouse handlers for swipe-to-close
    const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        startXRef.current = clientX;
        currentXRef.current = 0;
        isDraggingRef.current = false;
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        if (startXRef.current === null) return;

        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const diff = clientX - startXRef.current;

        // Only allow dragging to the right (positive diff)
        if (diff > 0) {
            isDraggingRef.current = true;
            currentXRef.current = diff;

            if (panelRef.current) {
                panelRef.current.style.transition = "none";
                panelRef.current.style.transform = `translateX(${diff}px)`;
            }
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (startXRef.current === null) return;

        const threshold = window.innerWidth * 0.3; // 30% of screen width

        if (panelRef.current) {
            panelRef.current.style.transition = "";
            panelRef.current.style.transform = "";
        }

        if (isDraggingRef.current && currentXRef.current > threshold) {
            onOpenChange(false);
        }

        startXRef.current = null;
        currentXRef.current = 0;
        isDraggingRef.current = false;
    }, [onOpenChange]);

    // Handle backdrop click
    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onOpenChange(false);
        }
    }, [onOpenChange]);

    if (!mounted || !isVisible) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 pointer-events-none">
            {/* Backdrop - visible on md+ */}
            <div
                className={cn(
                    "absolute inset-0 bg-black/50 transition-opacity duration-200 ease-out pointer-events-auto",
                    "hidden md:block",
                    isAnimating ? "opacity-100" : "opacity-0"
                )}
                onClick={handleBackdropClick}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={cn(
                    // Base styles
                    "absolute bg-white dark:bg-gray-900 overflow-auto pointer-events-auto",
                    "transition-transform duration-200 ease-out",
                    // Mobile: full screen minus header and bottom nav
                    "top-12 bottom-14 left-0 right-0",
                    // Tablet+: side panel (full height)
                    "md:top-0 md:bottom-0 md:left-auto md:right-0 md:w-[500px] lg:w-[600px] md:rounded-none",
                    "md:shadow-2xl md:border-l md:border-gray-200 md:dark:border-gray-700",
                    // Animation - slide from right
                    isAnimating ? "translate-x-0" : "translate-x-full",
                    className
                )}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseMove={(e) => {
                    if (startXRef.current !== null) {
                        handleTouchMove(e);
                    }
                }}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
            >
                {children}
            </div>
        </div>,
        document.body
    );
}

// Header component for consistent styling
interface SlidePanelHeaderProps {
    title: string;
    subtitle?: string;
    onClose: () => void;
    children?: React.ReactNode;
}

export function SlidePanelHeader({ title, subtitle, onClose, children }: SlidePanelHeaderProps) {
    return (
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-4 py-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                    aria-label="閉じる"
                >
                    <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                </button>
                <div className="flex-1 text-center">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
                    )}
                </div>
                <div className="w-8 h-8 flex items-center justify-center">
                    {children}
                </div>
            </div>
        </div>
    );
}

// Content component for consistent padding
interface SlidePanelContentProps {
    children: React.ReactNode;
    className?: string;
}

export function SlidePanelContent({ children, className }: SlidePanelContentProps) {
    return (
        <div className={cn("px-4 py-4", className)}>
            {children}
        </div>
    );
}
