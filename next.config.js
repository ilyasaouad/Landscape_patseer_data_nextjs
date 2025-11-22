/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ["pino", "thread-stream"],
    },
};

module.exports = nextConfig;
