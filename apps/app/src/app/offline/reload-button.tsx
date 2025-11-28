"use client";

export function ReloadButton() {
    return (
        <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
            再読み込み
        </button>
    );
}
