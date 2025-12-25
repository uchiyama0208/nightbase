"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FormValidationErrorProps {
    message?: string;
    className?: string;
}

/**
 * フォームバリデーションエラー表示コンポーネント
 */
export function FormValidationError({ message, className }: FormValidationErrorProps) {
    if (!message) return null;
    return (
        <p className={cn("text-sm text-red-600 dark:text-red-400 mt-1.5", className)}>
            {message}
        </p>
    );
}

interface FormFieldProps {
    label?: string;
    error?: string;
    required?: boolean;
    description?: string;
    children: React.ReactNode;
    className?: string;
}

/**
 * フォームフィールドラッパーコンポーネント
 * Label + Input + Description + Error を統一的にラップ
 */
export function FormField({
    label,
    error,
    required,
    description,
    children,
    className,
}: FormFieldProps) {
    return (
        <div className={cn("space-y-1.5", className)}>
            {label && (
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </Label>
            )}
            {children}
            {description && !error && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {description}
                </p>
            )}
            <FormValidationError message={error} />
        </div>
    );
}

interface FormSectionProps {
    title?: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}

/**
 * フォームセクションコンポーネント
 * 複数のフィールドをグループ化
 */
export function FormSection({
    title,
    description,
    children,
    className,
}: FormSectionProps) {
    return (
        <div className={cn("space-y-4", className)}>
            {(title || description) && (
                <div className="space-y-1">
                    {title && (
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                            {title}
                        </h3>
                    )}
                    {description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {description}
                        </p>
                    )}
                </div>
            )}
            <div className="space-y-4">{children}</div>
        </div>
    );
}
