"use client";

interface PageTitleProps {
    title: string;
    description?: string;
    /** @deprecated backTab is no longer used - back button is now in the mobile header */
    backTab?: string;
}

export function PageTitle({ title, description }: PageTitleProps) {
    return (
        <div className="mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {title}
            </h1>
            {description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {description}
                </p>
            )}
        </div>
    );
}
