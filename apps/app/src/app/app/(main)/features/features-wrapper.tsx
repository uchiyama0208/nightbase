"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFeaturesPageData } from "./actions";
import { FeaturesClient } from "./features-client";

function FeaturesSkeleton() {
    return (
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                        <div className="flex items-center gap-3">
                            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                        <div className="h-6 w-11 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function FeaturesWrapper() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [featureSettings, setFeatureSettings] = useState<Record<string, boolean> | null>(null);

    useEffect(() => {
        async function loadData() {
            const result = await getFeaturesPageData();
            if ("redirect" in result && result.redirect) {
                router.push(result.redirect);
                return;
            }
            if ("data" in result && result.data) {
                setFeatureSettings(result.data.featureSettings);
            }
            setIsLoading(false);
        }
        loadData();
    }, [router]);

    if (isLoading || !featureSettings) {
        return <FeaturesSkeleton />;
    }

    return <FeaturesClient initialSettings={featureSettings} />;
}
