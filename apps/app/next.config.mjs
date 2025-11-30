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
};

export default nextConfig;
