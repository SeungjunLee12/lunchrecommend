/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true, // next/image 사용 시 최적화 비활성화 (정적 내보내기용)
  },
};

export default nextConfig;
