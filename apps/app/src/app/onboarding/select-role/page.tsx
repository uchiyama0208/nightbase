import { createServerClient } from "@/lib/supabaseServerClient";
import { redirect } from "next/navigation";
import { SelectRoleForm } from "./select-role-form";

export default async function SelectRolePage() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/signup");
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <SelectRoleForm />
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
