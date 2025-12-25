export default function Loading() {
    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
            {/* Header skeleton */}
            <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />

            {/* Card skeletons */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                </div>
            </div>

            {/* Secondary card skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="space-y-3">
                    <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>
        </div>
    );
}
