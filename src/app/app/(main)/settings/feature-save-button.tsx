"use client";

import { useFormStatus } from "react-dom";

export function FeatureSaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-70 disabled:cursor-default"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <span className="relative inline-flex h-1.5 w-16 overflow-hidden rounded-full bg-blue-100">
            <span className="h-full w-full bg-blue-400 animate-pulse" />
          </span>
          <span className="text-xs">インストール中...</span>
        </span>
      ) : (
        <span>変更を保存</span>
      )}
    </button>
  );
}
