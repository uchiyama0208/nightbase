"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
    children,
    initialTheme = "light",
}: {
    children: React.ReactNode;
    initialTheme?: Theme;
}) {
    const [theme, setThemeState] = useState<Theme>(initialTheme);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Apply initial theme class
        document.documentElement.classList.toggle("dark", initialTheme === "dark");
    }, [initialTheme]);

    const setTheme = async (newTheme: Theme) => {
        setThemeState(newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");

        // Update in DB
        try {
            const { updateTheme } = await import("@/app/app/(main)/settings/actions");
            await updateTheme(newTheme);
        } catch (error) {
            console.error("Failed to update theme in DB:", error);
        }
    };

    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light");
    };

    // Prevent flash of unstyled content
    // Note: We must provide the context even if not mounted, otherwise useTheme will throw
    // if (!mounted) {
    //     return <>{children}</>;
    // }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
