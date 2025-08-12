"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, MapPin, DollarSign, Phone } from "lucide-react"

interface Restaurant {
  place_id: string
  name: string
  rating?: number
  rating_source?: "naver" | "google"
  vicinity: string
  types: string[]
  price_level?: number
  phone?: string
  category?: string
  photos?: Array<{
    photo_reference: string
  }>
}

interface RestaurantCardProps {
  restaurant: Restaurant
  isRecommended?: boolean
}

export function RestaurantCard({ restaurant, isRecommended = false }: RestaurantCardProps) {
  const getPriceLevel = (level?: number) => {
    if (!level) return null
    return "💰".repeat(level)
  }

  const getTypeInKorean = (type: string) => {
    const typeMap: { [key: string]: string } = {
      restaurant: "음식점",
      food: "음식",
      establishment: "시설",
      korean_restaurant: "한식",
      japanese_restaurant: "일식",
      chinese_restaurant: "중식",
      cafe: "카페",
      bakery: "베이커리",
      meal_takeaway: "테이크아웃",
      meal_delivery: "배달",
    }
    return typeMap[type] || type
  }

  const getRatingDisplay = (rating?: number, source?: "naver" | "google") => {
    if (!rating) return null

    const ratingText = rating >= 4.5 ? "매우 좋음" : rating >= 4.0 ? "좋음" : rating >= 3.5 ? "보통" : "아쉬움"

    const sourceIcon = source === "naver" ? "🟢" : "🔵"
    const sourceName = source === "naver" ? "네이버" : "구글"

    return (
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        <span className="text-sm font-medium">{rating}</span>
        <span className="text-xs text-gray-500">({ratingText})</span>
        <span className="text-xs text-gray-400 ml-1">
          {sourceIcon} {sourceName}
        </span>
      </div>
    )
  }

  const handleRestaurantClick = () => {
    const searchQuery = encodeURIComponent(restaurant.name)
    const mapUrl = `https://map.naver.com/v5/search/${searchQuery}`

    // 새 창으로 네이버 지도 열기
    window.open(mapUrl, "_blank", "width=1200,height=800,scrollbars=yes,resizable=yes")
  }

  return (
    <Card
      className={`hover:shadow-lg transition-all cursor-pointer hover:scale-105 ${isRecommended ? "ring-2 ring-orange-300" : ""}`}
      onClick={handleRestaurantClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Restaurant Name */}
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-lg text-gray-800 line-clamp-1 flex-1">{restaurant.name}</h3>
            {restaurant.category && (
              <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-600 border-blue-200">
                {restaurant.category}
              </Badge>
            )}
          </div>

          {/* Rating */}
          {restaurant.rating && getRatingDisplay(restaurant.rating, restaurant.rating_source)}

          {/* Address */}
          <div className="flex items-start gap-1">
            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-600 line-clamp-2">{restaurant.vicinity}</span>
          </div>

          {/* Phone */}
          {restaurant.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">{restaurant.phone}</span>
            </div>
          )}

          {/* Price Level */}
          {restaurant.price_level && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{getPriceLevel(restaurant.price_level)}</span>
            </div>
          )}

          {/* Types */}
          <div className="flex flex-wrap gap-1">
            {restaurant.types
              .filter((type) => !["establishment", "point_of_interest"].includes(type))
              .slice(0, 3)
              .map((type) => (
                <Badge key={type} variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                  {getTypeInKorean(type)}
                </Badge>
              ))}
          </div>

          {/* Recommended Badge */}
          {isRecommended && <Badge className="bg-orange-500 text-white">🎯 오늘의 추천!</Badge>}
        </div>
        <div className="text-xs text-gray-400 text-center mt-2 flex items-center justify-center gap-1">
          <span>🗺️</span>
          <span>클릭하면 네이버 지도에서 위치를 확인할 수 있습니다</span>
        </div>
      </CardContent>
    </Card>
  )
}
