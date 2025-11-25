import { ThemeProvider } from "@/components/theme-provider";
import { getAppData } from "./data-access";

export default async function AppRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { theme } = await getAppData();

    return (
        <ThemeProvider initialTheme={theme}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {children}
            </div>
        </ThemeProvider>
    );
}
