/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    turbo: false
  },
  i18n: {
    locales: ["ja", "en"],
    defaultLocale: "ja"
  }
};

export default nextConfig;
