"use client";

import { CastAssignment } from "@/types/floor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TableGridProps {
    grid: boolean[][];
    assignments?: CastAssignment[];
    onCellClick?: (rowIndex: number, colIndex: number) => void;
    className?: string;
}

export function TableGrid({ grid, assignments = [], onCellClick, className = "" }: TableGridProps) {
    if (!grid || grid.length === 0) return null;

    return (
        <div className={`inline-block border border-gray-300 rounded bg-white dark:bg-slate-900 ${className}`}>
            {grid.map((row, rowIndex) => (
                <div key={rowIndex} className="flex">
                    {row.map((cell, colIndex) => {
                        // Find assignment at this position
                        const assignment = assignments.find(
                            (a: any) => a.grid_x === colIndex && a.grid_y === rowIndex
                        );

                        return (
                            <div
                                key={colIndex}
                                onClick={() => onCellClick?.(rowIndex, colIndex)}
                                className={`
                                    w-7 h-7 sm:w-9 sm:h-9 border border-gray-100 dark:border-gray-800 relative
                                    ${cell ? "bg-green-100 dark:bg-green-900/20" : "bg-transparent"}
                                    ${onCellClick && cell ? "cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/40" : ""}
                                `}
                            >
                                {assignment && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-0.5">
                                        <div className="relative">
                                            <Avatar className="w-4 h-4 sm:w-5 sm:h-5 border border-white dark:border-slate-900 shadow-sm">
                                                <AvatarImage src={(assignment as any).profiles?.avatar_url} />
                                                <AvatarFallback className="text-[6px] sm:text-[8px]">
                                                    {(assignment as any).profiles?.display_name?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div
                                                className={`
                                                    absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full border border-white dark:border-slate-900
                                                    ${assignment.status === 'shime' ? 'bg-pink-500' : 'bg-blue-500'}
                                                `}
                                            />
                                        </div>
                                        <span className="text-[6px] sm:text-[7px] font-medium text-slate-900 dark:text-slate-100 truncate max-w-full text-center leading-none">
                                            {(assignment as any).profiles?.display_name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
