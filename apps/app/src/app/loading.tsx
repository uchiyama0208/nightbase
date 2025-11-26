import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
                <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                    読み込み中...
                </p>
            </div>
        </div>
    );
}
