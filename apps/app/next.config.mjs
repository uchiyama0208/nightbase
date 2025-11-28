/** @type {import('next').NextConfig} */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig = {
    reactStrictMode: true,

    turbopack: {
        root: join(__dirname, '../..'),
    },

    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.supabase.co',
            },
            {
                protocol: 'https',
                hostname: 'profile.line-scdn.net',
            },
        ],
    },

    env: {
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://app.nightbase.jp',
    },
};

const withPWA = (await import("@ducanh2912/next-pwa")).default({
    dest: "public",
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    swcMinify: true,
    disable: process.env.NODE_ENV === "development",
    workboxOptions: {
        disableDevLogs: true,
        runtimeCaching: [
            {
                urlPattern: /^https?.*/,
                handler: 'NetworkFirst',
                options: {
                    cacheName: 'offlineCache',
                    expiration: {
                        maxEntries: 200,
                    },
                    networkTimeoutSeconds: 10, // Fallback to cache if network takes longer than 10 seconds
                },
            },
            {
                urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|woff2?)$/i,
                handler: 'StaleWhileRevalidate',
                options: {
                    cacheName: 'assetCache',
                    expiration: {
                        maxEntries: 200,
                    },
                },
            },
        ],
    },
});

export default withPWA(nextConfig);
