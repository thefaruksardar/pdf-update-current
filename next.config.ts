/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fixes the "input directory /var/task/... does not exist" error
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
};

export default nextConfig;
