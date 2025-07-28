"use client"

import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"

interface DistanceFilterProps {
  selectedDistance: number
  onDistanceChange: (distance: number) => void
}

export function DistanceFilter({ selectedDistance, onDistanceChange }: DistanceFilterProps) {
  const distances = [
    { value: 500, label: "500m", description: "도보 5분" },
    { value: 1000, label: "1km", description: "도보 10분" },
    { value: 3000, label: "3km", description: "자전거 10분" },
    { value: 5000, label: "5km", description: "차량 10분" },
    { value: 10000, label: "10km", description: "차량 20분" },
  ]

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 text-center">검색 거리</h3>
      <div className="flex flex-wrap gap-2 justify-center">
        {distances.map((distance) => (
          <Button
            key={distance.value}
            variant={selectedDistance === distance.value ? "default" : "outline"}
            size="sm"
            onClick={() => onDistanceChange(distance.value)}
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
              selectedDistance === distance.value
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "border-green-300 text-green-700 hover:bg-green-50"
            }`}
          >
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="font-medium">{distance.label}</span>
            </div>
            <span className="text-xs opacity-80">{distance.description}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
