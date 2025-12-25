"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Clock } from "lucide-react";

interface WorkingTimeCardProps {
    clockInTime: string;
}

export function WorkingTimeCard({ clockInTime }: WorkingTimeCardProps) {
    const [elapsed, setElapsed] = useState("");

    useEffect(() => {
        const updateElapsed = () => {
            const now = new Date();
            const clockIn = new Date(clockInTime);
            const diff = now.getTime() - clockIn.getTime();

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setElapsed(`${hours}時間 ${minutes}分 ${seconds}秒`);
        };

        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);

        return () => clearInterval(interval);
    }, [clockInTime]);

    return (
        <Link href="/app/timecard?clockOut=true" className="block">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border border-blue-400 shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-white">
                        <Clock className="h-5 w-5" />
                        勤務中
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold font-mono">{elapsed}</div>
                    <p className="text-sm text-blue-100 mt-2">出勤してからの経過時間</p>
                </CardContent>
            </Card>
        </Link>
    );
}
