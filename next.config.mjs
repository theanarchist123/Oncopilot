/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "images.unsplash.com",
            },
            {
                protocol: "https",
                hostname: "plus.unsplash.com",
            }
        ]
    },
    // Allow larger request bodies for file uploads (default is 1 MB)
    experimental: {
        serverActions: {
            bodySizeLimit: "10mb",
        },
    },
    // Handle pdfjs-dist worker and canvas polyfill for Next.js
    webpack: (config, { isServer }) => {
        // pdf.js uses node-canvas on the server; exclude it from the client bundle
        if (!isServer) {
            config.resolve.alias.canvas = false;
        }
        return config;
    },
};

export default nextConfig;
