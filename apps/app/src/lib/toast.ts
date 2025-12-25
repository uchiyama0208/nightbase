import { toast } from "@/components/ui/use-toast";

/**
 * Toast ユーティリティ関数
 * 統一されたトースト表示のためのヘルパー
 */
export const showToast = {
    /**
     * 成功メッセージを表示
     */
    success: (title: string, description?: string) => {
        toast({
            title,
            description,
        });
    },

    /**
     * エラーメッセージを表示
     */
    error: (title: string, description?: string) => {
        toast({
            title,
            description,
            variant: "destructive",
        });
    },

    /**
     * 情報メッセージを表示
     */
    info: (title: string, description?: string) => {
        toast({
            title,
            description,
        });
    },

    /**
     * カスタムトーストを表示
     */
    custom: (options: Parameters<typeof toast>[0]) => {
        toast(options);
    },
};

// 便利なエイリアス
export const toastSuccess = showToast.success;
export const toastError = showToast.error;
export const toastInfo = showToast.info;
