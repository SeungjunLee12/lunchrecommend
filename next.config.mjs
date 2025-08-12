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
  output: 'export', // Capacitor 빌드를 위해 정적 HTML, CSS, JS 파일로 내보내기 설정
};

export default nextConfig;
