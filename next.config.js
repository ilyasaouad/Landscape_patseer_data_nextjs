/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        // force Next.js to use Webpack instead of Turbopack
        useWebpackBuildFallback: true,

        // needed for pino & thread-stream
        serverComponentsExternalPackages: ["pino", "thread-stream"],
    },
};

module.exports = nextConfig;
