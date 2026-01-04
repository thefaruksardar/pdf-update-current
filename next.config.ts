/** @type {import('next').NextConfig} */
const nextConfig = {
  // This tells Next.js to leave these packages alone
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
};

module.exports = nextConfig;
