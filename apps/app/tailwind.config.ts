import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
    darkMode: ['class'],
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                chart: {
                    '1': 'hsl(var(--chart-1))',
                    '2': 'hsl(var(--chart-2))',
                    '3': 'hsl(var(--chart-3))',
                    '4': 'hsl(var(--chart-4))',
                    '5': 'hsl(var(--chart-5))',
                },
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            gridTemplateRows: {
                '0': '0fr',
                '1': '1fr',
            },
            keyframes: {
                'accordion-down': {
                    from: { opacity: '0', transform: 'translateY(-8px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                'accordion-up': {
                    from: { opacity: '1', transform: 'translateY(0)' },
                    to: { opacity: '0', transform: 'translateY(-8px)' },
                },
                'slideDown': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-collapsible-content-height)' },
                },
                'slideUp': {
                    from: { height: 'var(--radix-collapsible-content-height)' },
                    to: { height: '0' },
                },
                'like-bounce': {
                    '0%': { transform: 'scale(1)' },
                    '25%': { transform: 'scale(1.3)' },
                    '50%': { transform: 'scale(0.9)' },
                    '75%': { transform: 'scale(1.1)' },
                    '100%': { transform: 'scale(1)' },
                },
                'collapse-down': {
                    from: { gridTemplateRows: '0fr', opacity: '0' },
                    to: { gridTemplateRows: '1fr', opacity: '1' },
                },
                'collapse-up': {
                    from: { gridTemplateRows: '1fr', opacity: '1' },
                    to: { gridTemplateRows: '0fr', opacity: '0' },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out forwards',
                'accordion-up': 'accordion-up 0.15s ease-out forwards',
                'like-bounce': 'like-bounce 0.4s ease-out',
                'collapse-down': 'collapse-down 0.2s ease-out forwards',
                'collapse-up': 'collapse-up 0.15s ease-out forwards',
                'slideDown': 'slideDown 0.3s ease-out',
                'slideUp': 'slideUp 0.3s ease-out',
            },
        },
    },
    plugins: [tailwindcssAnimate],
};

export default config;
