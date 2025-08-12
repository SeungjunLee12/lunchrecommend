import { type NextRequest, NextResponse } from "next/server"

// Function to calculate distance between two lat/lng points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // metres
  const φ1 = (lat1 * Math.PI) / 180 // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  const distance = R * c // in metres
  return distance
}

export async function POST(request: NextRequest) {
  try {
    const { lat, lng, query } = await request.json()

    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

    if (!GOOGLE_PLACES_API_KEY) {
      // API 키가 없으면 데모 모드 메시지 반환
      return NextResponse.json({
        address: "API 키 없음",
        comment: "Google Places API 키가 설정되지 않아 위치 검색이 제한됩니다.",
        error: "NO_API_KEY",
      })
    }

    if (query) {
      // Forward Geocoding (주소 -> 위도/경도)
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}&language=ko`
        const response = await fetch(url)

        if (!response.ok) {
          console.error(`Geocoding API HTTP Error for query: ${response.status} ${response.statusText}`)
          return NextResponse.json({ error: "위치 검색 API 오류", status: response.status }, { status: 500 })
        }

        const data = await response.json()

        if (data.results && data.results.length > 0) {
          const results = data.results.map((result: any) => ({
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            address: result.formatted_address,
            comment: "검색된 위치입니다. 맛집을 찾아보세요! 📍",
          }))
          return NextResponse.json({ results })
        } else {
          return NextResponse.json({ results: [], message: "검색된 위치가 없습니다." }, { status: 200 })
        }
      } catch (apiError) {
        console.error("Forward Geocoding API 오류:", apiError)
        return NextResponse.json({ error: "위치 검색 중 오류 발생", status: 500 }, { status: 500 })
      }
    } else if (lat && lng) {
      // Reverse Geocoding (위도/경도 -> 주소)
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_PLACES_API_KEY}&language=ko`
        const response = await fetch(url)

        if (!response.ok) {
          console.error(`Reverse Geocoding API HTTP Error: ${response.status} ${response.statusText}`)
          return NextResponse.json({
            address: "위치 확인됨",
            comment: "맛집 탐험을 시작해보세요! 🍽️",
            error: "API_ERROR",
          })
        }

        const data = await response.json()

        if (data.results && data.results.length > 0) {
          // 가장 적합한 결과 찾기 (도로명 주소 우선)
          let targetResult = data.results.find(
            (result: any) => result.types.includes("street_address") || result.types.includes("premise"),
          )
          if (!targetResult) {
            // 도로명 주소가 없으면 sublocality_level_1 (동) 또는 political (구/시) 포함 결과 찾기
            targetResult = data.results.find(
              (result: any) => result.types.includes("sublocality_level_1") || result.types.includes("political"),
            )
          }
          if (!targetResult) {
            // 그래도 없으면 첫 번째 결과 사용
            targetResult = data.results[0]
          }

          const addressComponents = targetResult.address_components

          let city = "" // 시/도 (administrative_area_level_1)
          let district = "" // 구/군 (administrative_area_level_2)
          let sublocalityLevel1 = "" // 동/읍/면 (sublocality_level_1)
          let roadName = "" // 도로명 (route)
          let buildingNumber = "" // 건물번호 (street_number)

          addressComponents.forEach((component: any) => {
            if (component.types.includes("administrative_area_level_1")) {
              city = component.long_name
            } else if (component.types.includes("administrative_area_level_2")) {
              district = component.long_name
            } else if (component.types.includes("sublocality_level_1")) {
              sublocalityLevel1 = component.long_name
            } else if (component.types.includes("route")) {
              roadName = component.long_name
            } else if (component.types.includes("street_number")) {
              buildingNumber = component.long_name
            }
          })

          // 주소 형식 결정
          let address = ""
          let comment = ""
          const addressParts: string[] = []

          // 시/도 추가 (예: 서울특별시)
          if (city) {
            addressParts.push(city)
          }

          // 구/군 또는 동/읍/면 중 더 상세한 정보 사용
          // district와 sublocalityLevel1이 모두 있으면 둘 다 사용 (예: 강남구 역삼동)
          if (district && sublocalityLevel1) {
            addressParts.push(district)
            addressParts.push(sublocalityLevel1)
          } else if (district) {
            // district만 있으면 district 사용 (예: 송파구)
            addressParts.push(district)
          } else if (sublocalityLevel1) {
            // sublocalityLevel1만 있으면 sublocalityLevel1 사용 (예: 역삼동)
            addressParts.push(sublocalityLevel1)
          }

          // 도로명 주소 추가 (도로명 + 건물번호)
          if (roadName) {
            let roadAddressDetail = roadName
            if (buildingNumber) {
              roadAddressDetail += ` ${buildingNumber}`
            }
            addressParts.push(roadAddressDetail)
          }

          address = addressParts.join(" ")

          // 주소가 너무 짧거나 일반적이면 기본 메시지 사용
          if (!address || address.trim() === "대한민국" || address.trim() === city) {
            address = "위치 확인됨"
          }

          // 한줄평 로직은 그대로 유지
          if (roadName) {
            if (roadName.includes("테헤란로")) {
              comment = "IT와 비즈니스의 중심가! 고급 맛집들이 즐비해요 💼"
            } else if (roadName.includes("강남대로")) {
              comment = "강남의 메인 스트리트! 트렌디한 맛집 천국 ✨"
            } else if (roadName.includes("홍익로") || roadName.includes("와우산로")) {
              comment = "젊음과 예술이 살아있는 홍대! 핫한 맛집들 🎨"
            } else if (roadName.includes("명동길") || roadName.includes("을지로")) {
              comment = "서울의 심장부! 전통과 현대가 만나는 맛의 거리 🏛️"
            } else if (roadName.includes("이태원로")) {
              comment = "세계 각국의 맛을 한 번에! 다국적 맛집 거리 🌍"
            } else if (roadName.includes("건대입구로") || roadName.includes("아차산로")) {
              comment = "대학가 특유의 맛있고 합리적인 맛집들! 🎓"
            } else if (roadName.includes("신촌로") || roadName.includes("연세로")) {
              comment = "청춘이 가득한 신촌! 추억의 맛집들 💫"
            } else if (roadName.includes("가로수길")) {
              comment = "세련된 카페와 레스토랑이 가득한 거리 🌳"
            } else if (roadName.includes("경리단길")) {
              comment = "숨겨진 맛집들의 보고! 로컬 핫플레이스 🔥"
            } else if (roadName.includes("성수일로") || roadName.includes("성수이로")) {
              comment = "힙한 성수동! 개성 넘치는 맛집들 🏭"
            } else if (roadName.includes("로")) {
              comment = "도로변 맛집들을 탐험해보세요! 🛣️"
            } else {
              comment = "새로운 맛집 발견의 기회! 🔍"
            }
          } else if (district) {
            // 구별 한줄평 (도로명이 없을 때)
            if (district.includes("강남")) {
              comment = "트렌디한 맛집들이 가득한 곳이네요! ✨"
            } else if (district.includes("마포")) {
              comment = "젊음과 활기가 넘치는 핫플레이스! 🎉"
            } else if (district.includes("중구")) {
              comment = "전통과 현대가 만나는 맛의 중심지! 🏛️"
            } else if (district.includes("용산")) {
              comment = "다양한 세계 음식을 만날 수 있는 곳! 🌍"
            } else if (district.includes("광진")) {
              comment = "대학가 특유의 맛있고 저렴한 맛집들! 🎓"
            } else if (district.includes("서대문")) {
              comment = "청춘이 가득한 맛집 천국! 💫"
            } else if (district.includes("성동")) {
              comment = "힙한 성수동과 왕십리! 개성 넘치는 맛집들 🏭"
            } else if (district.includes("시")) {
              comment = "지역 특색이 살아있는 맛집들을 찾아보세요! 🏘️"
            } else {
              comment = "숨겨진 로컬 맛집들이 기다리고 있어요! 🗺️"
            }
          } else {
            comment = "맛집 탐험을 시작해보세요! 🍽️"
          }

          // 읍/면 지역 처리
          if (sublocalityLevel1 && (sublocalityLevel1.includes("읍") || sublocalityLevel1.includes("면"))) {
            comment = "자연과 함께하는 향토 맛집들이 있는 곳! 🌾"
          }

          return NextResponse.json({
            address: address,
            comment: comment,
          })
        } else {
          return NextResponse.json({
            address: "위치 확인됨",
            comment: "맛집 탐험을 시작해보세요! 🍽️",
          })
        }
      } catch (apiError) {
        console.error("Geocoding API 오류:", apiError)
        return NextResponse.json({
          address: "위치 확인됨",
          comment: "맛집 탐험을 시작해보세요! 🍽️",
        })
      }
    } else {
      return NextResponse.json({ error: "위치 정보 또는 검색어가 필요합니다." }, { status: 400 })
    }
  } catch (error) {
    console.error("Geocode route error:", error)
    return NextResponse.json({
      address: "위치 확인됨",
      comment: "맛집 탐험을 시작해보세요! 🍽️",
      error: "SERVER_ERROR",
    })
  }
}
