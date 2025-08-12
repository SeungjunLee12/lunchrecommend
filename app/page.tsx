"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, MapPin, Shuffle, Search, Info, AlertTriangle, Star, ChevronLeft, Utensils } from "lucide-react"
import { LocationButton } from "@/components/location-button"
import { CategoryFilter } from "@/components/category-filter"
import { RatingFilter } from "@/components/rating-filter"
import { DistanceFilter } from "@/components/distance-filter"
import { RestaurantCard } from "@/components/restaurant-card"

interface Restaurant {
  place_id: string
  name: string
  rating?: number
  rating_source?: "naver" | "google"
  vicinity: string
  types: string[]
  price_level?: number
  photos?: Array<{
    photo_reference: string
  }>
  distance_meters?: number
}

// Define steps for the multi-step form
type Step = "location" | "category" | "rating" | "distance" | "search" | "results"

interface GeocodeResult {
  lat: number
  lng: number
  address: string
  comment: string
}

export default function Home() {
  // Define API_BASE_URL for Capacitor builds to point to the deployed Vercel API
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [randomRestaurant, setRandomRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedRating, setSelectedRating] = useState<number>(0)
  const [selectedDistance, setSelectedDistance] = useState<number>(1000)
  const [message, setMessage] = useState<string>("")
  const [isDemo, setIsDemo] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [hasSearched, setHasSearched] = useState(false)
  const [countryInfo, setCountryInfo] = useState<{ country: string; isKorea: boolean } | null>(null)
  const [sortOrder, setSortOrder] = useState<"rating_desc" | "distance_asc">("rating_desc")

  // New state for displaying address and comment in Home component
  const [displayAddress, setDisplayAddress] = useState<string>("")
  const [displayLocationComment, setDisplayLocationComment] = useState<string>("")
  const [addressLoading, setAddressLoading] = useState(false)

  // States for location search
  const [locationSearchQuery, setLocationSearchQuery] = useState<string>("")
  const [locationSearchResults, setLocationSearchResults] = useState<GeocodeResult[]>([])
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [locationSearchError, setLocationSearchError] = useState<string>("")

  // New state for searching within results
  const [resultsSearchQuery, setResultsSearchQuery] = useState<string>("")

  // Multi-step UI state
  const [currentStep, setCurrentStep] = useState<Step>("location")

  const categories = [
    { id: "all", name: "전체", types: [] },
    { id: "korean", name: "한식", types: ["korean_restaurant"] },
    { id: "western", name: "양식", types: ["restaurant"] },
    { id: "japanese", name: "일식", types: ["japanese_restaurant"] },
    { id: "chinese", name: "중식", types: ["chinese_restaurant"] },
    { id: "cafe", name: "카페", types: ["cafe"] },
  ]

  // Step navigation functions
  const goToNextStep = () => {
    if (currentStep === "location" && location) {
      setCurrentStep("category")
    } else if (currentStep === "category") {
      setCurrentStep("rating")
    } else if (currentStep === "rating") {
      setCurrentStep("distance")
    } else if (currentStep === "distance") {
      setCurrentStep("search")
    } else if (currentStep === "search") {
      // Search button click will handle setting to "results"
    }
  }

  const goToPreviousStep = () => {
    if (currentStep === "category") {
      setCurrentStep("location")
    } else if (currentStep === "rating") {
      setCurrentStep("category")
    } else if (currentStep === "distance") {
      setCurrentStep("rating")
    } else if (currentStep === "search") {
      setCurrentStep("distance")
    } else if (currentStep === "results") {
      setCurrentStep("search")
      setRestaurants([]) // 결과 화면에서 뒤로 가면 리스트 초기화
      setRandomRestaurant(null)
      setHasSearched(false)
      setResultsSearchQuery("") // 결과 내 검색어 초기화
    }
  }

  // Handler for clicking on filter summary buttons
  const handleFilterClick = async (step: Step) => {
    setCurrentStep(step)
    // Reset results if navigating back to a filter step
    if (step === "category" || step === "rating" || step === "distance" || step === "location") {
      setRestaurants([])
      setRandomRestaurant(null)
      setHasSearched(false)
      setResultsSearchQuery("") // 결과 내 검색어 초기화
    }
    // If navigating back to location, re-fetch address if location is already set
    if (step === "location" && location && !displayAddress) {
      setAddressLoading(true)
      try {
        const response = await fetch(`${API_BASE_URL}/api/geocode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(location),
        })
        if (response.ok) {
          const data = await response.json()
          setDisplayAddress(data.address || "위치 확인됨")
          setDisplayLocationComment(data.comment || "")
        } else {
          setDisplayAddress("위치 확인됨")
          setDisplayLocationComment("맛집 탐험을 시작해보세요! 🍽️")
        }
      } catch (error) {
        console.error("Failed to fetch address after location update:", error)
        setDisplayAddress("위치 확인됨")
        setDisplayLocationComment("맛집 탐험을 시작해보세요! 🍽️")
      } finally {
        setAddressLoading(false)
      }
    }
  }

  // Location update handler (for both current location and search result selection)
  const handleLocationUpdate = async (
    newLocation: { lat: number; lng: number },
    address?: string,
    comment?: string,
  ) => {
    console.log("handleLocationUpdate called. New location:", newLocation)
    setLocation(newLocation)
    setAddressLoading(true) // Set loading for address fetching
    setLocationSearchError("") // Clear any previous search errors

    if (address && comment) {
      // If address and comment are provided (from search result selection)
      setDisplayAddress(address)
      setDisplayLocationComment(comment)
      setAddressLoading(false)
      goToNextStep()
      return
    }

    // Otherwise, fetch address from lat/lng (for current location button)
    try {
      const response = await fetch(`${API_BASE_URL}/api/geocode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLocation),
      })
      if (response.ok) {
        const data = await response.json()
        setDisplayAddress(data.address || "위치 확인됨")
        setDisplayLocationComment(data.comment || "")
      } else {
        setDisplayAddress("위치 확인됨")
        setDisplayLocationComment("맛집 탐험을 시작해보세요! 🍽️")
      }
    } catch (error) {
      console.error("Failed to fetch address after location update:", error)
      setDisplayAddress("위치 확인됨")
      setDisplayLocationComment("맛집 탐험을 시작해보세요! 🍽️")
    } finally {
      setAddressLoading(false)
      goToNextStep() // Move to category step after address is set
    }
  }

  // Handler for location search
  const handleLocationSearch = async () => {
    if (!locationSearchQuery.trim()) {
      setLocationSearchError("검색어를 입력해주세요.")
      return
    }

    setIsSearchingLocation(true)
    setLocationSearchResults([])
    setLocationSearchError("")

    try {
      const response = await fetch(`${API_BASE_URL}/api/geocode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: locationSearchQuery }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "위치 검색에 실패했습니다.")
      }

      const data = await response.json()
      if (data.results && data.results.length > 0) {
        setLocationSearchResults(data.results)
      } else {
        setLocationSearchError("검색된 위치가 없습니다. 더 정확한 주소를 입력해보세요.")
      }
    } catch (error: any) {
      console.error("Location search error:", error)
      setLocationSearchError(error.message || "위치 검색 중 오류가 발생했습니다.")
    } finally {
      setIsSearchingLocation(false)
    }
  }

  // Category change handler
  const handleCategoryChange = (categoryId: string) => {
    console.log("handleCategoryChange called. New categoryId:", categoryId)
    setSelectedCategory(categoryId)
    goToNextStep() // Move to rating step
  }

  // Rating change handler
  const handleRatingChange = (rating: number) => {
    console.log("handleRatingChange called. New rating:", rating)
    setSelectedRating(rating)
    goToNextStep() // Move to distance step
  }

  // Distance change handler
  const handleDistanceChange = (distance: number) => {
    console.log("handleDistanceChange called. New distance:", distance)
    setSelectedDistance(distance)
    goToNextStep() // Move to search step
  }

  const searchRestaurants = async () => {
    if (!location) return

    setLoading(true)
    setMessage("")
    setDebugInfo("")
    setSortOrder("rating_desc") // 검색 시 기본 정렬 순서로 초기화
    setResultsSearchQuery("") // 새로운 검색 시 결과 내 검색어 초기화

    try {
      const category = categories.find((c) => c.id === selectedCategory)
      const keyword = category && category.id !== "all" ? category.name : undefined
      const response = await fetch(`${API_BASE_URL}/api/places`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location: location,
          radius: selectedDistance,
          type: "restaurant",
          keyword,
          minRating: selectedRating,
        }),
      })

      if (!response.ok) {
        throw new Error("맛집 검색에 실패했습니다.")
      }

      const data = await response.json()

      if (data.message) {
        setMessage(data.message)
      }

      if (data.mock) {
        setIsDemo(true)
      } else {
        setIsDemo(false)
      }

      if (data.debug) {
        setDebugInfo(data.debug)
      }

      if (data.country && typeof data.isKorea === "boolean") {
        setCountryInfo({ country: data.country, isKorea: data.isKorea })
      }

      setRestaurants(data.results || [])
      setRandomRestaurant(null)
      setHasSearched(true) // 검색 완료 후 hasSearched를 true로 설정
      setCurrentStep("results") // Move to results step
    } catch (err) {
      setMessage("오류가 발생했습니다. 다시 시도해주세요.")
      setDebugInfo("CLIENT_ERROR")
    } finally {
      setLoading(false)
    }
  }

  const getRandomRecommendation = () => {
    if (restaurants.length === 0) return

    const randomIndex = Math.floor(Math.random() * restaurants.length)
    setRandomRestaurant(restaurants[randomIndex])
  }

  const getDebugMessage = (debug: string) => {
    const messages: { [key: string]: string } = {
      NO_API_KEY: "환경 변수에 API 키가 설정되지 않았습니다.",
      REQUEST_DENIED: "API 키가 유효하지 않거나 Places API가 활성화되지 않았습니다.",
      OVER_QUERY_LIMIT: "일일 API 사용량을 초과했습니다.",
      INVALID_REQUEST: "API 요청 형식에 문제가 있습니다.",
      NETWORK_ERROR: "Google API 서버에 연결할 수 없습니다.",
      SERVER_ERROR: "서버 내부 오류가 발생했습니다.",
      SUCCESS: "Google Places API가 정상적으로 작동하고 있습니다.",
      SUCCESS_GOOGLE_PAGINATED: "Google Places API가 정상적으로 작동하고 있습니다. (페이지네이션 적용)",
      SUCCESS_NAVER: "네이버 검색 API가 정상적으로 작동하고 있습니다.",
      NAVER_API_FAILED_FALLBACK_GOOGLE: "네이버 검색 API 오류로 Google Places API를 사용합니다.",
    }
    return messages[debug] || `알 수 없는 오류: ${debug}`
  }

  const getDistanceLabel = (distance: number) => {
    if (distance >= 1000) {
      return `${distance / 1000}km`
    }
    return `${distance}m`
  }

  const getRatingSourceInfo = () => {
    if (!countryInfo) return ""
    return countryInfo.isKorea ? "네이버 평점 기준" : "구글 평점 기준"
  }

  // 필터 변경 시 검색 결과 초기화 (hasSearched가 true일 때만)
  useEffect(() => {
    console.log(
      "Filter useEffect triggered. selectedCategory:",
      selectedCategory,
      "selectedRating:",
      selectedRating,
      "selectedDistance:",
      selectedDistance,
    )
    // 필터가 변경되었고, 이전에 검색된 결과가 있다면 초기화
    if (hasSearched) {
      setRestaurants([])
      setRandomRestaurant(null)
      setHasSearched(false) // 초기화 후 hasSearched를 다시 false로 설정
      setResultsSearchQuery("") // 결과 내 검색어 초기화
      console.log("Search results cleared due to filter change.")
    }
  }, [selectedCategory, selectedRating, selectedDistance])

  // Memoized sorted and filtered restaurants based on sortOrder and resultsSearchQuery
  const filteredAndSortedRestaurants = useMemo(() => {
    if (!restaurants || restaurants.length === 0) {
      return []
    }

    let currentResults = [...restaurants]

    // 1. Filter by resultsSearchQuery
    if (resultsSearchQuery.trim()) {
      const lowerCaseQuery = resultsSearchQuery.trim().toLowerCase()
      currentResults = currentResults.filter(
        (restaurant) =>
          restaurant.name.toLowerCase().includes(lowerCaseQuery) ||
          restaurant.vicinity.toLowerCase().includes(lowerCaseQuery),
      )
    }

    // 2. Sort
    if (sortOrder === "rating_desc") {
      currentResults.sort((a, b) => {
        const ratingA = a.rating ?? -1
        const ratingB = b.rating ?? -1
        return ratingB - ratingA
      })
    } else if (sortOrder === "distance_asc") {
      currentResults.sort((a, b) => {
        const distA = a.distance_meters ?? Number.POSITIVE_INFINITY
        const distB = b.distance_meters ?? Number.POSITIVE_INFINITY
        return distA - distB
      })
    }
    return currentResults
  }, [restaurants, sortOrder, resultsSearchQuery])

  // Function to search the current resultsSearchQuery on Naver Map
  const handleSearchKeywordOnNaverMap = () => {
    if (resultsSearchQuery.trim()) {
      const naverMapQuery = encodeURIComponent(resultsSearchQuery.trim())
      const naverMapUrl = `https://map.naver.com/v5/search/${naverMapQuery}`
      window.open(naverMapUrl, "_blank", "width=1200,height=800,scrollbars=yes,resizable=yes")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🍽️ 이승준의 슬기로운 오늘의 점메추</h1>
          <p className="text-gray-600">위치 기반 맛집 추천으로 점심 고민 끝!</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            {isDemo && (
              <Badge variant="outline" className="border-blue-300 text-blue-600">
                <Info className="w-3 h-3 mr-1" />
                데모 모드
              </Badge>
            )}
            {countryInfo && (
              <Badge variant="outline" className="border-green-300 text-green-600">
                📍 {countryInfo.country} • {getRatingSourceInfo()}
              </Badge>
            )}
          </div>
        </div>

        {/* Main Content Area for Steps */}
        <Card className="mb-6 p-6">
          {/* Filter Summary / Navigation - Always visible within the card */}
          {(currentStep !== "location" || (currentStep === "location" && location)) && (
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {location && (
                <Button
                  variant={currentStep === "location" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterClick("location")}
                  className={currentStep === "location" ? "bg-blue-500 text-white" : "border-blue-300 text-blue-600"}
                >
                  <MapPin className="w-3 h-3 mr-1" /> 위치: {addressLoading ? "확인 중..." : displayAddress || "확인됨"}
                </Button>
              )}
              {location && ( // Category is available after location
                <Button
                  variant={currentStep === "category" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterClick("category")}
                  className={
                    currentStep === "category" ? "bg-orange-500 text-white" : "border-orange-300 text-orange-600"
                  }
                >
                  <Utensils className="w-3 h-3 mr-1" /> 음식: {categories.find((c) => c.id === selectedCategory)?.name}
                </Button>
              )}
              {location &&
                selectedCategory && ( // Rating is available after category
                  <Button
                    variant={currentStep === "rating" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterClick("rating")}
                    className={
                      currentStep === "rating" ? "bg-yellow-500 text-white" : "border-yellow-300 text-yellow-700"
                    }
                  >
                    <Star className="w-3 h-3 mr-1" /> 평점: {selectedRating === 0 ? "전체" : `${selectedRating}★ 이상`}
                  </Button>
                )}
              {location &&
                selectedCategory &&
                selectedRating !== undefined && ( // Distance is available after rating
                  <Button
                    variant={currentStep === "distance" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterClick("distance")}
                    className={
                      currentStep === "distance" ? "bg-green-500 text-white" : "border-green-300 text-green-700"
                    }
                  >
                    <MapPin className="w-3 h-3 mr-1" /> 거리: {getDistanceLabel(selectedDistance)}
                  </Button>
                )}
            </div>
          )}

          {/* Navigation Buttons (only for steps after location and before results) */}
          {currentStep !== "location" && currentStep !== "results" && (
            <div className="flex justify-between items-center mb-4">
              <Button variant="outline" onClick={goToPreviousStep} size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" /> 이전
              </Button>
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                {currentStep === "category" && "2단계: 음식 종류 선택"}
                {currentStep === "rating" && "3단계: 평점 선택"}
                {currentStep === "distance" && "4단계: 검색 거리 선택"}
                {currentStep === "search" && "5단계: 맛집 검색"}
              </Badge>
              <div className="w-16"></div> {/* Placeholder for alignment */}
            </div>
          )}

          {/* Step 1: Location */}
          {currentStep === "location" && (
            <div className="text-center space-y-6">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mb-3">
                1단계: 위치 확인
              </Badge>

              {/* Current Location Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-700">내 현재 위치</h3>
                <LocationButton onLocationUpdate={handleLocationUpdate} />
                {location && (
                  <div className="mt-3 space-y-2">
                    {addressLoading ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>주소 확인 중...</span>
                      </div>
                    ) : displayAddress ? (
                      <>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                          <MapPin className="w-4 h-4" />
                          <span>현재 위치: {displayAddress}</span>
                        </div>
                        {displayLocationComment && (
                          <div className="text-sm text-gray-600 italic max-w-md mx-auto">{displayLocationComment}</div>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-gray-300" />
                <span className="flex-shrink mx-4 text-gray-500 text-sm">또는</span>
                <div className="flex-grow border-t border-gray-300" />
              </div>

              {/* Location Search Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-700">주소 검색</h3>
                <div className="flex w-full max-w-md items-center space-x-2 mx-auto">
                  <Input
                    type="text"
                    placeholder="예: 서울 강남구 역삼동"
                    value={locationSearchQuery}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleLocationSearch()
                      }
                    }}
                    disabled={isSearchingLocation}
                  />
                  <Button onClick={handleLocationSearch} disabled={isSearchingLocation}>
                    {isSearchingLocation ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="sr-only">검색</span>
                  </Button>
                </div>
                {locationSearchError && (
                  <p className="text-red-500 text-sm mt-2 max-w-md mx-auto">{locationSearchError}</p>
                )}
                {locationSearchResults.length > 0 && (
                  <div className="mt-4 max-w-md mx-auto bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <ul className="divide-y divide-gray-100">
                      {locationSearchResults.map((result, index) => (
                        <li
                          key={index}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-left"
                          onClick={() =>
                            handleLocationUpdate({ lat: result.lat, lng: result.lng }, result.address, result.comment)
                          }
                        >
                          <p className="font-medium text-gray-800">{result.address}</p>
                          <p className="text-sm text-gray-500">{result.comment}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Category Filter */}
          {currentStep === "category" && (
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          )}

          {/* Step 3: Rating Filter */}
          {currentStep === "rating" && (
            <RatingFilter selectedRating={selectedRating} onRatingChange={handleRatingChange} />
          )}

          {/* Step 4: Distance Filter */}
          {currentStep === "distance" && (
            <DistanceFilter selectedDistance={selectedDistance} onDistanceChange={handleDistanceChange} />
          )}

          {/* Step 5: Search Button */}
          {currentStep === "search" && (
            <div className="text-center">
              <Button
                onClick={searchRestaurants}
                disabled={loading}
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    검색 중...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    맛집 찾기
                  </>
                )}
              </Button>
              {location && (
                <div className="mt-2 text-sm text-gray-500">
                  {categories.find((c) => c.id === selectedCategory)?.name}
                  {selectedRating > 0 && ` • ${selectedRating}★ 이상`}
                  {` • ${getDistanceLabel(selectedDistance)} 이내`}
                  {countryInfo && ` • ${getRatingSourceInfo()}`}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Status Message (always visible if message exists) */}
        {message && (
          <Card className={`mb-6 ${isDemo ? "border-orange-200 bg-orange-50" : "border-blue-200 bg-blue-50"}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-2">
                {isDemo ? (
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                ) : (
                  <Info className="w-4 h-4 text-blue-600" />
                )}
                <p className={`text-center ${isDemo ? "text-orange-600" : "text-blue-600"}`}>{message}</p>
              </div>
              {debugInfo && (
                <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600 text-center">
                    <strong>디버그 정보:</strong> {getDebugMessage(debugInfo)}
                  </p>
                  {debugInfo === "REQUEST_DENIED" && (
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      <p>해결 방법:</p>
                      <p>1. Google Cloud Console에서 Places API 활성화</p>
                      <p>2. 결제 정보 등록</p>
                      <p>3. API 키 권한 확인</p>
                    </div>
                  )}
                  {debugInfo === "OVER_QUERY_LIMIT" && (
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      <p>내일 다시 시도하거나 Google Cloud Console에서 할당량을 늘려주세요.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {currentStep === "results" && (
          <>
            <div className="mb-8">
              <div className="text-center mb-4">
                <Button
                  onClick={getRandomRecommendation}
                  variant="outline"
                  size="lg"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50 bg-transparent"
                >
                  <Shuffle className="mr-2 h-4 w-4" />
                  랜덤 추천받기
                </Button>
              </div>

              {randomRestaurant && (
                <Card className="border-orange-200 bg-orange-50 mb-6">
                  <CardHeader>
                    <CardTitle className="text-center text-orange-700">🎯 오늘의 추천 메뉴!</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RestaurantCard restaurant={randomRestaurant} isRecommended />
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
                주변 맛집 ({filteredAndSortedRestaurants.length}곳)
                <div className="text-sm text-gray-500 mt-1">
                  {categories.find((c) => c.id === selectedCategory)?.name}
                  {selectedRating > 0 && ` • ${selectedRating}★ 이상`}
                  {` • ${getDistanceLabel(selectedDistance)} 이내`}
                  {countryInfo && ` • ${getRatingSourceInfo()}`}
                </div>
              </h2>
              {/* Results Search Input */}
              <div className="flex w-full max-w-md items-center space-x-2 mx-auto mb-4">
                <Input
                  type="text"
                  placeholder="결과 내에서 검색 (예: 김밥, 카페)"
                  value={resultsSearchQuery}
                  onChange={(e) => setResultsSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      // Enter 키를 눌러도 필터링이 바로 적용되므로 별도 함수 호출 불필요
                    }
                  }}
                />
                <Button variant="outline" onClick={() => setResultsSearchQuery("")}>
                  <Search className="h-4 w-4" />
                  <span className="sr-only">검색 초기화</span>
                </Button>
              </div>

              {/* Sorting Controls */}
              <div className="flex justify-center gap-2 mb-4">
                <Button
                  variant={sortOrder === "rating_desc" ? "default" : "outline"}
                  onClick={() => setSortOrder("rating_desc")}
                  size="sm"
                  className={`${sortOrder === "rating_desc" ? "bg-purple-500 hover:bg-purple-600 text-white" : "border-purple-300 text-purple-700 hover:bg-purple-50"}`}
                >
                  <Star className="w-4 h-4 mr-1" /> 평점순
                </Button>
                <Button
                  variant={sortOrder === "distance_asc" ? "default" : "outline"}
                  onClick={() => setSortOrder("distance_asc")}
                  size="sm"
                  className={`${sortOrder === "distance_asc" ? "bg-purple-500 hover:bg-purple-600 text-white" : "border-purple-300 text-purple-700 hover:bg-purple-50"}`}
                >
                  <MapPin className="w-4 h-4 mr-1" /> 가까운순
                </Button>
              </div>
              {filteredAndSortedRestaurants.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredAndSortedRestaurants.map((restaurant) => (
                    <RestaurantCard key={restaurant.place_id} restaurant={restaurant} />
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      {resultsSearchQuery.trim() ? "검색 결과가 없습니다" : "조건에 맞는 맛집이 없습니다"}
                    </h3>
                    <p className="text-gray-500">
                      {resultsSearchQuery.trim()
                        ? "입력하신 키워드에 맞는 맛집을 찾을 수 없습니다."
                        : `현재 설정된 조건(${getDistanceLabel(selectedDistance)} 이내의 ${selectedRating > 0 ? `${selectedRating}★ 이상 ` : ""}${categories.find((c) => c.id === selectedCategory)?.name} 맛집)에 맞는 결과를 찾을 수 없습니다.`}
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      {resultsSearchQuery.trim()
                        ? "다른 키워드로 검색하거나 검색 필드를 초기화해보세요."
                        : "검색 거리를 늘리거나 다른 조건을 선택해보세요."}
                    </p>
                    {/* New: Dynamic keyword search suggestion */}
                    {resultsSearchQuery.trim() && (
                      <div className="mt-6">
                        <p className="text-gray-600 mb-3">혹시 주변 '{resultsSearchQuery.trim()}'을(를) 찾으시나요?</p>
                        <Button
                          onClick={handleSearchKeywordOnNaverMap}
                          variant="outline"
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          <Search className="mr-2 h-4 w-4" />
                          주변 '{resultsSearchQuery.trim()}' 검색
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
            {/* Back to Search Button */}
            <div className="text-center mt-8">
              <Button variant="outline" onClick={goToPreviousStep} size="lg">
                <ChevronLeft className="w-4 h-4 mr-2" /> 다시 검색하기
              </Button>
            </div>
          </>
        )}

        {/* Empty State / No Results (only if not in results step or no results) */}
        {currentStep !== "results" && !location && (
          <Card className="text-center py-12">
            <CardContent>
              <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">위치를 확인해주세요</h3>
              <p className="text-gray-500">현재 위치를 기반으로 주변 맛집을 찾아드립니다</p>
            </CardContent>
          </Card>
        )}

        {currentStep === "results" && restaurants.length === 0 && !loading && hasSearched && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-6xl mb-4">😔</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">조건에 맞는 맛집이 없습니다</h3>
              <p className="text-gray-500">
                {getDistanceLabel(selectedDistance)} 이내의 {selectedRating > 0 ? `${selectedRating}★ 이상 ` : ""}
                {categories.find((c) => c.id === selectedCategory)?.name} 맛집을 찾을 수 없습니다
              </p>
              <p className="text-gray-400 text-sm mt-2">검색 거리를 늘리거나 다른 조건을 선택해보세요</p>
            </CardContent>
            {/* Back to Search Button */}
            <div className="text-center mt-8">
              <Button variant="outline" onClick={goToPreviousStep} size="lg">
                <ChevronLeft className="w-4 h-4 mr-2" /> 다시 검색하기
              </Button>
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>© 2025 이승준의 슬기로운 오늘의 점메추 - 맛있는 하루를 만들어보세요! 🍴</p>
          <p className="mt-1">Copyright by 이승준</p>
        </div>
      </div>
    </div>
  )
}
