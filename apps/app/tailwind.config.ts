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
                // Modal animations
                'modal-in': {
                    from: { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
                    to: { opacity: '1', transform: 'scale(1) translateY(0)' },
                },
                'modal-out': {
                    from: { opacity: '1', transform: 'scale(1) translateY(0)' },
                    to: { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
                },
                // Overlay animations
                'overlay-in': {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                'overlay-out': {
                    from: { opacity: '1' },
                    to: { opacity: '0' },
                },
                // Sheet animations
                'sheet-in-right': {
                    from: { transform: 'translateX(100%)' },
                    to: { transform: 'translateX(0)' },
                },
                'sheet-out-right': {
                    from: { transform: 'translateX(0)' },
                    to: { transform: 'translateX(100%)' },
                },
                'sheet-in-left': {
                    from: { transform: 'translateX(-100%)' },
                    to: { transform: 'translateX(0)' },
                },
                'sheet-out-left': {
                    from: { transform: 'translateX(0)' },
                    to: { transform: 'translateX(-100%)' },
                },
                'sheet-in-bottom': {
                    from: { transform: 'translateY(100%)' },
                    to: { transform: 'translateY(0)' },
                },
                'sheet-out-bottom': {
                    from: { transform: 'translateY(0)' },
                    to: { transform: 'translateY(100%)' },
                },
                'sheet-in-top': {
                    from: { transform: 'translateY(-100%)' },
                    to: { transform: 'translateY(0)' },
                },
                'sheet-out-top': {
                    from: { transform: 'translateY(0)' },
                    to: { transform: 'translateY(-100%)' },
                },
                // Button press
                'button-press': {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(0.97)' },
                    '100%': { transform: 'scale(1)' },
                },
                // Subtle pulse
                'subtle-pulse': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.7' },
                },
                // Shake for errors
                'shake': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
                    '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
                },
                // Spin in
                'spin-in': {
                    from: { opacity: '0', transform: 'rotate(-180deg) scale(0.5)' },
                    to: { opacity: '1', transform: 'rotate(0) scale(1)' },
                },
                // Fade in up (for list items)
                'fade-in-up': {
                    from: { opacity: '0', transform: 'translateY(10px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                // Scale in
                'scale-in': {
                    from: { opacity: '0', transform: 'scale(0.9)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
                // Pop
                'pop': {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.05)' },
                    '100%': { transform: 'scale(1)' },
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
                // Modal
                'modal-in': 'modal-in 0.2s ease-out forwards',
                'modal-out': 'modal-out 0.15s ease-in forwards',
                'overlay-in': 'overlay-in 0.2s ease-out forwards',
                'overlay-out': 'overlay-out 0.15s ease-in forwards',
                // Sheet
                'sheet-in-right': 'sheet-in-right 0.3s ease-out forwards',
                'sheet-out-right': 'sheet-out-right 0.2s ease-in forwards',
                'sheet-in-left': 'sheet-in-left 0.3s ease-out forwards',
                'sheet-out-left': 'sheet-out-left 0.2s ease-in forwards',
                'sheet-in-bottom': 'sheet-in-bottom 0.3s ease-out forwards',
                'sheet-out-bottom': 'sheet-out-bottom 0.2s ease-in forwards',
                'sheet-in-top': 'sheet-in-top 0.3s ease-out forwards',
                'sheet-out-top': 'sheet-out-top 0.2s ease-in forwards',
                // Interactions
                'button-press': 'button-press 0.15s ease-out',
                'subtle-pulse': 'subtle-pulse 2s ease-in-out infinite',
                'shake': 'shake 0.5s ease-in-out',
                'spin-in': 'spin-in 0.3s ease-out forwards',
                'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
                'scale-in': 'scale-in 0.2s ease-out forwards',
                'pop': 'pop 0.2s ease-out',
            },
        },
    },
    plugins: [tailwindcssAnimate],
};

export default config;
