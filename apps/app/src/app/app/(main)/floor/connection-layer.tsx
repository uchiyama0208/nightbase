"use client";

import { Table, TableSession } from "@/types/floor";

interface ConnectionLayerProps {
    tables: Table[];
    sessions: TableSession[];
}

export function ConnectionLayer({ tables, sessions }: ConnectionLayerProps) {
    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <defs>
                <marker id="arrowhead-blue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                </marker>
                <marker id="arrowhead-pink" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#ec4899" />
                </marker>
            </defs>

            {sessions.map(session => {
                const table = tables.find(t => t.id === session.table_id);
                if (!table) return null;

                const tableCenterX = table.x + table.width / 2;
                const tableCenterY = table.y + table.height / 2;

                return (session as any).cast_assignments?.map((assignment: any, index: number) => {
                    // Calculate cast position (distributed around the table)
                    // In a real app, this would be dynamic or draggable. 
                    // For now, we distribute them in a circle around the table.
                    const totalAssignments = (session as any).cast_assignments.length;
                    const angle = (index / totalAssignments) * Math.PI * 2;
                    const radius = Math.max(table.width, table.height) * 0.8 + 40;

                    const castX = tableCenterX + Math.cos(angle) * radius;
                    const castY = tableCenterY + Math.sin(angle) * radius;

                    const color = assignment.status === 'shime' ? '#ec4899' : '#3b82f6';
                    const marker = assignment.status === 'shime' ? 'url(#arrowhead-pink)' : 'url(#arrowhead-blue)';

                    return (
                        <g key={assignment.id}>
                            {/* Line from Cast to Table */}
                            <line
                                x1={castX}
                                y1={castY}
                                x2={tableCenterX}
                                y2={tableCenterY}
                                stroke={color}
                                strokeWidth="2"
                                strokeDasharray={assignment.status === 'help' ? "5,5" : "none"}
                                markerEnd={marker}
                            />

                            {/* Cast Node (Visual placeholder for where the cast icon would be) */}
                            {/* Actual cast icon is rendered by the main component, but we draw the line here */}
                        </g>
                    );
                });
            })}
        </svg>
    );
}
