"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Save } from "lucide-react";

interface SlipSectionProps {
    title: string;
    children: ReactNode;
    editable?: boolean;
    isEditing?: boolean;
    hasItems?: boolean;
    onAdd?: () => void;
    onEdit?: () => void;
    onSave?: () => void;
    addLabel?: string;
    showAddButton?: boolean;
    showEditButton?: boolean;
}

export function SlipSection({
    title,
    children,
    editable = true,
    isEditing = false,
    hasItems = true,
    onAdd,
    onEdit,
    onSave,
    addLabel,
    showAddButton = true,
    showEditButton = true,
}: SlipSectionProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{title}</h3>
                {editable && (
                    <div className="flex gap-1">
                        {hasItems && showEditButton && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={isEditing ? onSave : onEdit}
                            >
                                {isEditing ? (
                                    <>
                                        <Save className="h-3 w-3 mr-1" />
                                        保存
                                    </>
                                ) : (
                                    <>
                                        <Pencil className="h-3 w-3 mr-1" />
                                        編集
                                    </>
                                )}
                            </Button>
                        )}
                        {showAddButton && onAdd && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={onAdd}
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                {addLabel || "追加"}
                            </Button>
                        )}
                    </div>
                )}
            </div>
            {children}
        </div>
    );
}
