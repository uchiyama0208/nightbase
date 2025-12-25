"use client";

import { createContext, useContext, useState, useEffect, useTransition, ReactNode, Suspense, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";

interface GlobalLoadingContextType {
    isLoading: boolean;
    setIsLoading: (value: boolean) => void;
    showLoading: (message?: string) => void;
    hideLoading: () => void;
    isPending: boolean;
    startTransition: (callback: () => void) => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | null>(null);

export function useGlobalLoading() {
    const context = useContext(GlobalLoadingContext);
    if (!context) {
        throw new Error("useGlobalLoading must be used within GlobalLoadingProvider");
    }
    return context;
}

// ナビゲーション検知用の内部コンポーネント
function NavigationEvents({ onNavigationStart, onNavigationEnd }: {
    onNavigationStart: () => void;
    onNavigationEnd: () => void;
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // 内部リンククリック時にローディング開始
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as Element;
            const link = target.closest('a');
            if (link?.href && link.href.startsWith(window.location.origin)) {
                // 同じページへのリンクは除外
                const url = new URL(link.href);
                if (url.pathname !== pathname || url.search !== window.location.search) {
                    onNavigationStart();
                }
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [pathname, onNavigationStart]);

    useEffect(() => {
        // パスが変わったらナビゲーション完了
        onNavigationEnd();
    }, [pathname, searchParams, onNavigationEnd]);

    return null;
}

// React Query の状態を監視するコンポーネント
function QueryLoadingWatcher({ setQueryLoading }: { setQueryLoading: (loading: boolean) => void }) {
    const isFetching = useIsFetching();
    const isMutating = useIsMutating();

    useEffect(() => {
        setQueryLoading(isFetching > 0 || isMutating > 0);
    }, [isFetching, isMutating, setQueryLoading]);

    return null;
}

export function GlobalLoadingProvider({ children }: { children: ReactNode }) {
    const [manualLoading, setManualLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
    const [navigationLoading, setNavigationLoading] = useState(false);
    const [queryLoading, setQueryLoading] = useState(false);
    const [isPending, startTransition] = useTransition();

    const showLoading = useCallback((message?: string) => {
        setLoadingMessage(message || null);
        setManualLoading(true);
    }, []);
    const hideLoading = useCallback(() => {
        setManualLoading(false);
        setLoadingMessage(null);
    }, []);
    const handleNavigationStart = useCallback(() => setNavigationLoading(true), []);
    const handleNavigationEnd = useCallback(() => setNavigationLoading(false), []);
    const handleQueryLoadingChange = useCallback((loading: boolean) => setQueryLoading(loading), []);

    // いずれかがローディング中なら表示
    const isLoading = manualLoading || navigationLoading || queryLoading || isPending;

    return (
        <GlobalLoadingContext.Provider value={{
            isLoading,
            setIsLoading: setManualLoading,
            showLoading,
            hideLoading,
            isPending,
            startTransition,
        }}>
            <Suspense fallback={null}>
                <NavigationEvents
                    onNavigationStart={handleNavigationStart}
                    onNavigationEnd={handleNavigationEnd}
                />
            </Suspense>
            <QueryLoadingWatcher setQueryLoading={handleQueryLoadingChange} />
            {children}
            {/* 左下ローディングインジケーター（フッターメニューの上） */}
            {isLoading && (
                <div className="fixed bottom-20 left-4 z-[100] flex items-center gap-2 bg-white text-gray-900 dark:bg-gray-900 dark:text-white px-4 py-2 rounded-xl shadow-lg animate-fade-in-up">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">{manualLoading && loadingMessage ? loadingMessage : "読み込み中..."}</span>
                </div>
            )}
        </GlobalLoadingContext.Provider>
    );
}
