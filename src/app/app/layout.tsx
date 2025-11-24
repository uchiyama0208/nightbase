import { ThemeProvider } from "@/components/theme-provider";
import { createServerClient } from "@/lib/supabaseServerClient";

export default async function AppRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    let theme: "light" | "dark" = "light";

    if (user) {
        const { data: appUser } = await supabase
            .from("users")
            .select("current_profile_id")
            .eq("id", user.id)
            .maybeSingle();

        if (appUser?.current_profile_id) {
            try {
                const { data: profile, error } = await supabase
                    .from("profiles")
                    .select("theme")
                    .eq("id", appUser.current_profile_id)
                    .maybeSingle();

                if (!error && profile?.theme) {
                    theme = profile.theme as "light" | "dark";
                }
            } catch (e) {
                console.error("Failed to fetch theme:", e);
                // Fallback to default theme
            }
        }
    }

    return (
        <ThemeProvider initialTheme={theme}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {children}
            </div>
        </ThemeProvider>
    );
}
