"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

interface QueryProviderProps {
    children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // データは5分間フレッシュとみなす
                        staleTime: 5 * 60 * 1000,
                        // キャッシュは30分間保持
                        gcTime: 30 * 60 * 1000,
                        // エラー時の自動リトライ
                        retry: 1,
                        // ウィンドウフォーカス時の再フェッチは無効
                        refetchOnWindowFocus: false,
                    },
                    mutations: {
                        // ミューテーションはリトライしない
                        retry: 0,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
