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

export async function POST(request: NextRequest) {
  try {
    const { location, radius = 1000, type = "restaurant", minRating = 0 } = await request.json()

    if (!location || !location.lat || !location.lng) {
      return NextResponse.json({ error: "위치 정보가 필요합니다." }, { status: 400 })
    }

    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY
    // const NAVER_SEARCH_CLIENT_ID = process.env.NAVER_SEARCH_CLIENT_ID
    // const NAVER_SEARCH_CLIENT_SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET

    // 국가 확인 (Google API 키로 계속 진행)
    const countryInfo = await checkCountry(location.lat, location.lng, GOOGLE_PLACES_API_KEY || "")
    console.log(`Location detected: ${countryInfo.country} (${countryInfo.isKorea ? "Korea" : "International"})`)

    let allResults: any[] = []
    let debugMessage = ""
    let apiUsed = ""
    let statusMessage = ""
    let isMock = false

    // Always use Google Places API now
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
        url.searchParams.append("type", type) // 요청된 type을 Google API에 전달
        url.searchParams.append("key", GOOGLE_PLACES_API_KEY)
        url.searchParams.append("language", "ko")

        if (nextPageToken) {
          url.searchParams.append("pagetoken", nextPageToken)
        }

        console.log(`Using Google Places API (Page ${pageCount + 1}) with radius: ${radius}m, type: ${type}`)
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

    // 모든 페이지에서 가져온 결과에 필터링 및 거리 계산 적용
    let finalResults = allResults || []

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
    }

    if (apiUsed === "GOOGLE" && type && type !== "all") {
      finalResults = finalResults.filter((restaurant: any) => {
        if (!restaurant.types || !Array.isArray(restaurant.types)) {
          return false
        }
        if (type === "restaurant") {
          return restaurant.types.includes("restaurant")
        }
        return restaurant.types.includes(type)
      })
    }

    // 평점 필터링 (Google API 결과에만 해당)
    if (apiUsed === "GOOGLE" && minRating > 0) {
      finalResults = finalResults.filter((restaurant: any) => restaurant.rating && restaurant.rating >= minRating)
    }

    finalResults = finalResults.map((restaurant: any) => ({
      ...restaurant,
      rating_source: "google", // Always Google now since Naver is commented out
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
