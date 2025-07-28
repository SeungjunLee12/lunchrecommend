import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.yourcompany.lunchrecommendation", // 고유한 앱 ID로 변경해주세요 (예: com.mycompany.myapp)
  appName: "이승준의 슬기로운 오늘의 점메추", // 앱 이름
  webDir: "out", // Next.js 정적 빌드 결과물이 생성되는 디렉토리 (next.config.mjs의 output: 'export' 설정 시)
  bundledWebRuntime: false,
  server: {
    // Capacitor 개발 서버 설정 (선택 사항, 실제 APK에서는 사용되지 않음)
    // 웹 앱이 API를 호출할 Vercel 배포 URL을 여기에 설정할 수도 있습니다.
    // 하지만 app/page.tsx에서 NEXT_PUBLIC_API_BASE_URL을 사용하는 것이 더 유연합니다.
    // url: 'https://your-deployed-vercel-app.vercel.app', // 배포된 Vercel 앱의 URL
    cleartext: true, // HTTP 연결 허용 (개발용)
  },
}

export default config
