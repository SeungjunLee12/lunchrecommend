"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Utensils, Wine } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">🍽️ 이승준의 슬기로운 추천</h1>
          <p className="text-xl text-gray-600 mb-8">위치 기반 맛집 & 술집 추천으로 고민 끝!</p>
        </div>

        {/* Main Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* 점메추 Card */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-orange-200">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-orange-100 rounded-full w-20 h-20 flex items-center justify-center">
                <Utensils className="w-10 h-10 text-orange-600" />
              </div>
              <CardTitle className="text-2xl text-orange-700">슬기로운 점메추</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                주변 맛집을 찾아서
                <br />
                점심 메뉴 고민을 해결해드려요
              </p>
              <Link href="/lunch">
                <Button size="lg" className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 text-lg">
                  점심 맛집 찾기
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* 술메추 Card */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-purple-200">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-purple-100 rounded-full w-20 h-20 flex items-center justify-center">
                <Wine className="w-10 h-10 text-purple-600" />
              </div>
              <CardTitle className="text-2xl text-purple-700">슬기로운 술메추</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                주변 술집을 찾아서
                <br />
                저녁 약속 장소를 추천해드려요
              </p>
              <Link href="/drinks">
                <Button size="lg" className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 text-lg">
                  술집 찾기
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-8">주요 기능</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6">
              <div className="text-3xl mb-3">📍</div>
              <h3 className="font-semibold text-gray-700 mb-2">위치 기반 검색</h3>
              <p className="text-gray-600 text-sm">현재 위치나 원하는 주소를 기반으로 주변 맛집을 찾아드려요</p>
            </div>
            <div className="p-6">
              <div className="text-3xl mb-3">⭐</div>
              <h3 className="font-semibold text-gray-700 mb-2">평점 필터링</h3>
              <p className="text-gray-600 text-sm">원하는 평점 이상의 검증된 맛집만 추천받을 수 있어요</p>
            </div>
            <div className="p-6">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-semibold text-gray-700 mb-2">랜덤 추천</h3>
              <p className="text-gray-600 text-sm">선택 장애가 있다면 랜덤 추천으로 오늘의 메뉴를 결정하세요</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500 text-sm">
          <p>© 2025 이승준의 슬기로운 추천 - 맛있는 하루를 만들어보세요! 🍴</p>
          <p className="mt-1">Copyright by 이승준</p>
        </div>
      </div>
    </div>
  )
}
