"use client";

// Grid placement item (guest or cast)
export interface GridPlacement {
    id: string;
    type: "guest" | "cast";
    grid_x: number;
    grid_y: number;
    display_name: string;
}

interface TableGridProps {
    grid: boolean[][];
    placements?: GridPlacement[];
    onCellClick?: (rowIndex: number, colIndex: number, placement: GridPlacement | null) => void;
    className?: string;
}

export function TableGrid({ grid, placements = [], onCellClick, className = "" }: TableGridProps) {
    if (!grid || grid.length === 0) return null;

    return (
        <div className={`inline-block border border-gray-300 rounded bg-white dark:bg-gray-900 ${className}`}>
            {grid.map((row, rowIndex) => (
                <div key={rowIndex} className="flex">
                    {row.map((cell, colIndex) => {
                        // Find placement at this position
                        const placement = placements.find(
                            (p) => p.grid_x === colIndex && p.grid_y === rowIndex
                        );

                        // Border color based on type
                        const borderColor = placement
                            ? placement.type === "guest"
                                ? "border-blue-500 border-2 rounded"
                                : "border-pink-500 border-2 rounded"
                            : "border-gray-100 dark:border-gray-800";

                        return (
                            <div
                                key={colIndex}
                                onClick={() => onCellClick?.(rowIndex, colIndex, placement || null)}
                                className={`
                                    w-7 h-7 sm:w-9 sm:h-9 border relative
                                    ${borderColor}
                                    ${cell ? "bg-gray-200 dark:bg-gray-700" : "bg-transparent"}
                                    ${onCellClick && cell ? "cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" : ""}
                                `}
                            >
                                {placement && (
                                    <div className="absolute inset-0 flex items-center justify-center z-10 p-0.5 overflow-hidden">
                                        <span className="text-[8px] sm:text-[10px] font-bold text-gray-900 dark:text-gray-100 truncate w-full text-center leading-tight">
                                            {placement.display_name}
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
