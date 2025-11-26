"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { JoinRequestsTable } from "../../invitations/join-requests-table";
import { getJoinRequestsData } from "../../invitations/actions";

export default function JoinRequestsPage() {
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const result = await getJoinRequestsData();
                if (result.redirect) {
                    router.push(result.redirect);
                    return;
                }
                setData(result.data);
            } catch (err: any) {
                console.error("Failed to fetch join requests data", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [router]);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        );
    }

    if (error) {
        return <div className="space-y-2">Error loading join requests: {error}</div>;
    }

    if (!data) return null;

    const { joinRequests } = data;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight">参加申請</h1>
                <p className="text-muted-foreground">
                    スタッフやキャストからの参加申請を管理します。
                </p>
            </div>

            <div className="mt-6">
                <JoinRequestsTable requests={joinRequests} />
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
