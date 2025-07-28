"use client"

import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"

interface RatingFilterProps {
  selectedRating: number
  onRatingChange: (rating: number) => void
}

export function RatingFilter({ selectedRating, onRatingChange }: RatingFilterProps) {
  const ratings = [
    { value: 0, label: "전체", stars: 0 },
    { value: 3.0, label: "3.0★ 이상", stars: 3 },
    { value: 3.5, label: "3.5★ 이상", stars: 3.5 },
    { value: 4.0, label: "4.0★ 이상", stars: 4 },
    { value: 4.5, label: "4.5★ 이상", stars: 4.5 },
  ]

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0
    const stars = []

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)
    }

    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative">
          <Star className="w-3 h-3 text-gray-300" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          </div>
        </div>,
      )
    }

    return stars
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 text-center">평점 필터</h3>
      <div className="flex flex-wrap gap-2 justify-center">
        {ratings.map((rating) => (
          <Button
            key={rating.value}
            variant={selectedRating === rating.value ? "default" : "outline"}
            size="sm"
            onClick={() => onRatingChange(rating.value)}
            className={`flex items-center gap-1 ${
              selectedRating === rating.value
                ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                : "border-yellow-300 text-yellow-700 hover:bg-yellow-50"
            }`}
          >
            {rating.stars > 0 ? (
              <div className="flex items-center gap-0.5">
                {renderStars(rating.stars)}
                <span className="ml-1 text-xs">이상</span>
              </div>
            ) : (
              <span className="text-xs">전체</span>
            )}
          </Button>
        ))}
      </div>
    </div>
  )
}
