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

// Mock data for fallback
const getMockRestaurants = (type: string, minRating = 0, radius = 1000, isKorea = true) => {
  const allMockRestaurants = [
    {
      place_id: "mock_1",
      name: "맛있는 김밥천국",
      rating: 4.2,
      rating_source: isKorea ? "naver" : "google",
      vicinity: "서울특별시 강남구 테헤란로 123",
      types: ["restaurant", "food", "establishment"],
      price_level: 1,
      distance: 300,
      phone: "02-1234-5678",
      category: "한식",
      geometry: { location: { lat: 37.5, lng: 127.0 } }, // Mock location
    },
    {
      place_id: "mock_2",
      name: "이자카야 하나",
      rating: 4.5,
      rating_source: isKorea ? "naver" : "google",
      vicinity: "서울특별시 강남구 역삼동 456",
      types: ["japanese_restaurant", "restaurant", "food"],
      price_level: 2,
      distance: 800,
      phone: "02-2345-6789",
      category: "일식",
      geometry: { location: { lat: 37.505, lng: 127.005 } }, // Mock location
    },
    {
      place_id: "mock_3",
      name: "중국집 용궁",
      rating: 4.0,
      rating_source: isKorea ? "naver" : "google",
      vicinity: "서울특별시 강남구 선릉로 789",
      types: ["chinese_restaurant", "restaurant", "food"],
      price_level: 2,
      distance: 1200,
      phone: "02-3456-7890",
      category: "중식",
      geometry: { location: { lat: 37.51, lng: 127.01 } }, // Mock location
    },
    {
      place_id: "mock_4",
      name: "파스타 하우스",
      rating: 4.3,
      rating_source: isKorea ? "naver" : "google",
      vicinity: "서울특별시 강남구 강남대로 101",
      types: ["restaurant", "food", "establishment"],
      price_level: 3,
      distance: 2100,
      phone: "02-4567-8901",
      category: "양식",
      geometry: { location: { lat: 37.515, lng: 127.015 } }, // Mock location
    },
    {
      place_id: "mock_5",
      name: "한우마을",
      rating: 4.7,
      rating_source: isKorea ? "naver" : "google",
      vicinity: "서울특별시 강남구 논현로 202",
      types: ["korean_restaurant", "restaurant", "food"],
      price_level: 4,
      distance: 3500,
      phone: "02-5678-9012",
      category: "한식",
      geometry: { location: { lat: 37.52, lng: 127.02 } }, // Mock location
    },
    {
      place_id: "mock_6",
      name: "스타벅스 강남점",
      rating: 4.1,
      rating_source: isKorea ? "naver" : "google",
      vicinity: "서울특별시 강남구 테헤란로 303",
      types: ["cafe", "food", "establishment"],
      price_level: 2,
      distance: 600,
      phone: "02-6789-0123",
      category: "카페",
      geometry: { location: { lat: 37.525, lng: 127.025 } }, // Mock location
    },
  ]

  // Filter by distance first
  let filteredRestaurants = allMockRestaurants.filter((restaurant) => restaurant.distance <= radius)

  // Filter by type
  if (type !== "restaurant" && type !== "all") {
    const categoryMap: { [key: string]: string } = {
      korean_restaurant: "한식",
      japanese_restaurant: "일식",
      chinese_restaurant: "중식",
      western_restaurant: "양식",
      cafe: "카페",
    }
    const targetCategory = categoryMap[type]
    if (targetCategory) {
      filteredRestaurants = filteredRestaurants.filter((restaurant) => restaurant.category === targetCategory)
    }
  }

  // Filter by minimum rating
  if (minRating > 0) {
    filteredRestaurants = filteredRestaurants.filter((restaurant) => restaurant.rating >= minRating)
  }

  // Add distance_meters to mock data
  return filteredRestaurants.map((r) => ({
    ...r,
    distance_meters: r.distance, // Use mock distance as distance_meters
  }))
}

// 국가 확인 함수 (Google API 키를 사용하므로 유지)
const checkCountry = async (lat: number, lng: number, apiKey: string) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=ko`
    const response = await fetch(url)
    const data = await response.json()

    if (data.results && data.results.length > 0) {
      const addressComponents = data.results[0].address_components
      for (const component of addressComponents) {
        if (component.types.includes("country")) {
          return {
            country: component.long_name,
            countryCode: component.short_name,
            isKorea: component.short_name === "KR",
          }
        }
      }
    }
    return { country: "Unknown", countryCode: "Unknown", isKorea: false }
  } catch (error) {
    console.error("Country check failed:", error)
    return { country: "Unknown", countryCode: "Unknown", isKorea: false }
  }
}

// 네이버 검색 API 호출 함수
async function searchNaverPlaces(
  query: string,
  userLat: number, // 사용자 위도
  userLng: number, // 사용자 경도
  radius: number,
  type: string,
  minRating: number,
  clientId: string,
  clientSecret: string,
  keyword?: string,
) {
  const NAVER_API_URL = "https://openapi.naver.com/v1/search/local.json"

  // 카테고리 매핑 (네이버 검색 API는 특정 카테고리 코드를 지원하지 않으므로 일반적인 키워드 사용)
  const categoryKeywords: { [key: string]: string } = {
    korean_restaurant: "한식",
    japanese_restaurant: "일식",
    chinese_restaurant: "중식",
    western_restaurant: "양식",
    cafe: "카페",
    restaurant: "음식점", // 일반 음식점
    all: "맛집", // 전체 검색
  }
  const searchKeyword = keyword || categoryKeywords[type] || "맛집"

  const fullQuery = `${searchKeyword} ${query}`

  const params = new URLSearchParams({
    query: fullQuery,
    display: "30", // 최대 30개 결과
    sort: "random", // 네이버 API는 'distance' 정렬 시 정확한 lat/lng 기반이 아님
  })

  try {
    // --- 디버깅을 위한 console.log 추가 ---
    console.log("--- Naver API Call Debug ---")
    console.log(`Using NAVER_SEARCH_CLIENT_ID: ${clientId ? clientId.substring(0, 5) + "..." : "Not set"}`)
    console.log(`Naver API URL: ${NAVER_API_URL}?${params.toString()}`)
    console.log(`Naver API Headers: X-Naver-Client-Id, X-Naver-Client-Secret`)
    // --- 디버깅 끝 ---

    const response = await fetch(`${NAVER_API_URL}?${params.toString()}`, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Naver API HTTP Error: ${response.status} ${errorText}`)
      throw new Error(`Naver API HTTP Error: ${response.status}`)
    }

    const data = await response.json()
    console.log("Naver API raw response:", data)

    if (data.items) {
      let results = data.items
        .map((item: any) => {
          // 네이버 API의 mapx, mapy는 TM 좌표계이거나 스케일링된 WGS84일 수 있습니다.
          // 여기서는 스케일링된 WGS84로 가정하고 1e7로 나눕니다.
          // 실제 서비스에서는 정확한 좌표 변환 라이브러리(예: proj4js) 사용을 권장합니다.
          const restaurantLat = Number.parseFloat(item.mapy) / 1e7
          const restaurantLng = Number.parseFloat(item.mapx) / 1e7

          // 유효하지 않은 좌표 값 체크
          if (
            isNaN(restaurantLat) ||
            isNaN(restaurantLng) ||
            restaurantLat < -90 ||
            restaurantLat > 90 ||
            restaurantLng < -180 ||
            restaurantLng > 180
          ) {
            console.warn(
              `Invalid coordinates from Naver API for ${item.title}: mapx=${item.mapx}, mapy=${item.mapy}. Skipping this item.`,
            )
            return null // 유효하지 않은 항목은 건너뛰기
          }

          return {
            place_id: item.link || item.address, // 고유 ID로 사용
            name: item.title.replace(/<[^>]*>?/gm, ""), // HTML 태그 제거
            rating: null, // 네이버 검색 API는 평점 직접 제공 안함
            rating_source: "naver",
            vicinity: item.address,
            types: [categoryKeywords[type] || "음식점"], // 네이버 카테고리 매핑
            price_level: null,
            phone: item.telephone,
            geometry: { location: { lat: restaurantLat, lng: restaurantLng } },
            // 사용자 위치와 맛집 위치 간의 실제 거리 계산
            distance_meters: calculateDistance(userLat, userLng, restaurantLat, restaurantLng),
          }
        })
        .filter((item: any) => item !== null) // null 항목 필터링

      // 네이버 API는 평점 필터링을 직접 지원하지 않으므로, 클라이언트에서 처리해야 함.
      // 현재는 평점이 null이므로 이 필터링은 효과 없음.
      if (minRating > 0) {
        results = results.filter((r: any) => r.rating && r.rating >= minRating)
      }

      // 거리 필터링 (네이버 API는 직접 지원하지 않으므로, 여기서 계산하여 필터링)
      results = results.filter((r: any) => r.distance_meters <= radius)

      return results
    }
    return []
  } catch (error) {
    console.error("Error fetching from Naver API:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const { location, radius = 1000, minRating = 0, keyword } = await request.json()
    const type = "restaurant"

    if (!location || !location.lat || !location.lng) {
      return NextResponse.json({ error: "위치 정보가 필요합니다." }, { status: 400 })
    }

    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY
    const NAVER_SEARCH_CLIENT_ID = process.env.NAVER_SEARCH_CLIENT_ID
    const NAVER_SEARCH_CLIENT_SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET

    // 국가 확인 (Google API 키로 계속 진행)
    const countryInfo = await checkCountry(location.lat, location.lng, GOOGLE_PLACES_API_KEY || "")
    console.log(`Location detected: ${countryInfo.country} (${countryInfo.isKorea ? "Korea" : "International"})`)

    let allResults: any[] = []
    let debugMessage = ""
    let apiUsed = ""
    let statusMessage = ""
    let isMock = false

    // 한국일 경우 네이버 검색 API 우선 시도
    if (countryInfo.isKorea && NAVER_SEARCH_CLIENT_ID && NAVER_SEARCH_CLIENT_SECRET) {
      try {
        // Geocoding API를 통해 현재 위치의 동/구 이름을 가져와 네이버 검색 쿼리에 활용
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=${GOOGLE_PLACES_API_KEY}&language=ko`
        const geocodeResponse = await fetch(geocodeUrl)
        const geocodeData = await geocodeResponse.json()
        let currentAddressQuery = "현재 위치" // 기본값

        if (geocodeData.results && geocodeData.results.length > 0) {
          const addressComponents = geocodeData.results[0].address_components
          let district = ""
          let sublocality = ""
          addressComponents.forEach((component: any) => {
            if (component.types.includes("administrative_area_level_2")) {
              district = component.long_name
            }
            if (component.types.includes("sublocality_level_1")) {
              sublocality = component.long_name
            }
          })
          currentAddressQuery = sublocality || district || "현재 위치"
        }

        console.log(`Attempting Naver Search API for Korea with query: ${currentAddressQuery}`)
        const naverResults = await searchNaverPlaces(
          currentAddressQuery,
          location.lat, // 사용자 위도 전달
          location.lng, // 사용자 경도 전달
          radius,
          type,
          minRating,
          NAVER_SEARCH_CLIENT_ID,
          NAVER_SEARCH_CLIENT_SECRET,
          keyword,
        )

        allResults = naverResults
        apiUsed = "NAVER"
        debugMessage = "SUCCESS_NAVER"
        statusMessage = `네이버 검색 API로 ${allResults.length}개 맛집 정보를 제공합니다.`
      } catch (naverError) {
        console.error("Naver Search API failed, falling back to Google Places API:", naverError)
        debugMessage = "NAVER_API_FAILED_FALLBACK_GOOGLE"
        statusMessage = "네이버 검색 API 오류로 Google Places API를 사용합니다."
        // 네이버 API 실패 시 Google API로 폴백
      }
    }

    // 네이버 API를 사용하지 않았거나 실패했을 경우 Google Places API 사용
    if (apiUsed !== "NAVER" || allResults.length === 0) {
      if (!GOOGLE_PLACES_API_KEY) {
        console.log("No Google Places API key found, using mock data.")
        isMock = true
        allResults = getMockRestaurants(type, minRating, radius, countryInfo.isKorea)
        debugMessage = "NO_API_KEY"
        statusMessage = "Google Places API 키가 설정되지 않아 데모 모드로 실행됩니다."
      } else {
        apiUsed = "GOOGLE"
        let nextPageToken: string | undefined = undefined
        let pageCount = 0
        const MAX_PAGES = 3 // 최대 3페이지 (약 60개 결과)까지 가져오기

        do {
          const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json")
          url.searchParams.append("location", `${location.lat},${location.lng}`)
          url.searchParams.append("radius", radius.toString())
          url.searchParams.append("type", type) // 항상 restaurant 타입 사용
          if (keyword) url.searchParams.append("keyword", keyword)
          url.searchParams.append("key", GOOGLE_PLACES_API_KEY)
          url.searchParams.append("language", "ko")

          if (nextPageToken) {
            url.searchParams.append("pagetoken", nextPageToken)
          }

          console.log(`Using Google Places API (Page ${pageCount + 1}) with radius: ${radius}m, type: ${type}, keyword: ${keyword || ""}`)
          const response = await fetch(url.toString())

          if (!response.ok) {
            console.log(`HTTP Error: ${response.status} ${response.statusText}`)
            debugMessage = `HTTP_ERROR_${response.status}`
            statusMessage = `Google Places API HTTP 오류 (${response.status})로 인해 ${allResults.length > 0 ? "일부 결과만 제공됩니다." : "데모 모드로 전환되었습니다."}`
            isMock = allResults.length === 0
            if (isMock) allResults = getMockRestaurants(type, minRating, radius, countryInfo.isKorea)
            break // 오류 발생 시 페이지네이션 중단
          }

          const data = await response.json()
          console.log(`Google Places API response status: ${data.status}`)

          if (data.status === "OK" && data.results) {
            allResults = allResults.concat(data.results)
            nextPageToken = data.next_page_token
            pageCount++
          } else {
            nextPageToken = undefined
          }

          if (nextPageToken && pageCount < MAX_PAGES) {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }
        } while (nextPageToken && pageCount < MAX_PAGES)

        debugMessage = "SUCCESS_GOOGLE_PAGINATED"
        statusMessage = `Google Places API로 ${allResults.length}개 맛집 정보를 제공합니다.`
      }
    }

    // 모든 페이지에서 가져온 결과에 필터링 및 거리 계산 적용
    let finalResults = allResults || []

    // 각 맛집에 사용자 위치로부터의 거리 추가 (Google API 결과에만 해당)
    if (apiUsed === "GOOGLE") {
      finalResults = finalResults.map((restaurant: any) => ({
        ...restaurant,
        distance_meters: calculateDistance(
          location.lat,
          location.lng,
          restaurant.geometry.location.lat,
          restaurant.geometry.location.lng,
        ),
      }))
    } else if (apiUsed === "NAVER") {
      // 네이버 API 결과는 searchNaverPlaces 함수 내에서 거리 계산 및 필터링이 이미 적용됨
      // 여기서는 추가적인 거리 계산 없이 그대로 사용
    }

    // 2차 필터링: keyword가 있을 경우 이름이나 주소에 keyword가 포함된 장소만 남기기 (Google API 결과에만 해당)
    if (apiUsed === "GOOGLE" && keyword) {
      finalResults = finalResults.filter((restaurant: any) => {
        const nameMatch = restaurant.name && restaurant.name.includes(keyword)
        const vicinityMatch = restaurant.vicinity && restaurant.vicinity.includes(keyword)
        return nameMatch || vicinityMatch
      })
    }

    // 평점 필터링 (Google API 결과에만 해당)
    if (apiUsed === "GOOGLE" && minRating > 0) {
      finalResults = finalResults.filter((restaurant: any) => restaurant.rating && restaurant.rating >= minRating)
    }

    // 평점 소스 정보 설정
    finalResults = finalResults.map((restaurant: any) => ({
      ...restaurant,
      rating_source: apiUsed === "NAVER" ? "naver" : "google",
    }))

    console.log(`${apiUsed} API returned ${allResults.length} raw results, ${finalResults.length} after filtering`)
    return NextResponse.json({
      results: finalResults,
      status: "OK",
      mock: isMock,
      message: statusMessage,
      debug: debugMessage,
      country: countryInfo.country,
      isKorea: countryInfo.isKorea,
    })
  } catch (error) {
    console.error("Places API route error:", error)
    return NextResponse.json({
      results: getMockRestaurants("restaurant", 0, 1000, true),
      status: "OK",
      mock: true,
      message: "서버 오류로 인해 데모 모드로 전환되었습니다.",
      debug: "SERVER_ERROR",
      country: "대한민국",
      isKorea: true,
    })
  }
}
