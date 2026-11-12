import type { NextConfig } from 'next';

// BASE_PATH задаётся только для выкладки в подпапку (GitHub Pages): BASE_PATH=/radiohub-tech npm run build
const basePath = process.env.BASE_PATH || '';

const config: NextConfig = {
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default config;
