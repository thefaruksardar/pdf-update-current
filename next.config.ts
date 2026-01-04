/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude large binaries from server bundle
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
};

export default nextConfig;
