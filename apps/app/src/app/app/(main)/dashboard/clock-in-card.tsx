"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface ClockInCardProps {
    lastWorkDate?: string;
    clockIn?: string;
    clockOut?: string;
}

export function ClockInCard({ lastWorkDate, clockIn, clockOut }: ClockInCardProps) {
    const router = useRouter();

    const formattedDate = lastWorkDate
        ? format(new Date(lastWorkDate), "yyyy年M月d日", { locale: ja })
        : "記録なし";

    const formattedTime = clockIn && clockOut
        ? `${format(new Date(clockIn), "HH:mm")} - ${format(new Date(clockOut), "HH:mm")}`
        : "";

    return (
        <Card
            className="shadow-md hover:shadow-lg transition-all cursor-pointer border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900"
            onClick={() => router.push("/app/timecard?openModal=true")}
        >
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-full">
                            <Clock className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                出勤する
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                前回の出勤: {formattedDate} {formattedTime}
                            </p>
                        </div>
                    </div>
                    <div className="text-blue-600 dark:text-blue-400">
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
