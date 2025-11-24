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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <SelectRoleForm />
            </div>
        </div>
    );
}
