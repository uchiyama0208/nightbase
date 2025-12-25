import { ThemeProvider } from "@/components/theme-provider";
import { GlobalLoadingProvider } from "@/components/global-loading";
import { QueryProvider } from "./providers";
import { getAppData } from "./data-access";

export default async function AppRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { theme } = await getAppData();

    return (
        <QueryProvider>
            <ThemeProvider initialTheme={theme}>
                <GlobalLoadingProvider>
                    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                        {children}
                    </div>
                </GlobalLoadingProvider>
            </ThemeProvider>
        </QueryProvider>
    );
}
