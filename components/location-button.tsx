"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MapPin, Loader2, CheckCircle } from "lucide-react"

interface LocationButtonProps {
  onLocationUpdate: (location: { lat: number; lng: number }) => void
  // Removed currentAddress, locationComment, addressLoading props as Home component will manage these
}

export function LocationButton({ onLocationUpdate }: LocationButtonProps) {
  const [loading, setLoading] = useState(false)
  const [hasLocation, setHasLocation] = useState(false)
  const [error, setError] = useState<string>("")

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("위치 서비스를 지원하지 않는 브라우저입니다.")
      return
    }

    setLoading(true)
    setError("")
    setHasLocation(false) // Reset hasLocation on new attempt

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        onLocationUpdate(location) // Pass location to parent
        setHasLocation(true)
        setLoading(false)
      },
      (error) => {
        let errorMessage = "위치를 가져올 수 없습니다."

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "위치 접근 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요."
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "위치 정보를 사용할 수 없습니다."
            break
          case error.TIMEOUT:
            errorMessage = "위치 요청 시간이 초과되었습니다."
            break
        }

        setError(errorMessage)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5분
      },
    )
  }

  return (
    <div className="text-center">
      <Button
        onClick={getCurrentLocation}
        disabled={loading}
        size="lg"
        className={`px-8 py-3 ${
          hasLocation ? "bg-green-500 hover:bg-green-600" : "bg-blue-500 hover:bg-blue-600"
        } text-white`}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            위치 확인 중...
          </>
        ) : hasLocation ? (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            위치 확인 완료
          </>
        ) : (
          <>
            <MapPin className="mr-2 h-4 w-4" />내 위치 확인
          </>
        )}
      </Button>

      {error && <p className="text-red-500 text-sm mt-2 max-w-md mx-auto">{error}</p>}
    </div>
  )
}
