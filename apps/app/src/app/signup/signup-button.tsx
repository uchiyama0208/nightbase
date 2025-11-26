"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SignupButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            disabled={pending}
            className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
            {pending ? "登録中..." : "アカウント作成"}
        </Button>
    );
}
