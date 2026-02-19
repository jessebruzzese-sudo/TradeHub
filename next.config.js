/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracing: false,
  experimental: {
    // Fix: ensure styled-jsx is included in Vercel serverless runtime bundle
    outputFileTracingIncludes: {
      '/**': ['node_modules/styled-jsx/**'],
    },
  },
};

module.exports = nextConfig;
