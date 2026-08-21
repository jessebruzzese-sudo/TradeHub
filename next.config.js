/** @type {import('next').NextConfig} */
const nextConfig = {
	distDir: "dist",
	logging: {
		serverFunctions: true
	},
  experimental: {
		serverActions: true
  },
	typescript: {
		ignoreBuildErrors: true
	},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
  },
};

module.exports = nextConfig;
