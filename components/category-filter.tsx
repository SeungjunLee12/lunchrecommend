"use client"

import { Button } from "@/components/ui/button"

interface Category {
  id: string
  name: string
  types: string[]
}

interface CategoryFilterProps {
  categories: Category[]
  selectedCategory: string
  onCategoryChange: (categoryId: string) => void
}

export function CategoryFilter({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange(category.id)}
          className={`${
            selectedCategory === category.id
              ? "bg-orange-500 hover:bg-orange-600 text-white"
              : "border-orange-300 text-orange-600 hover:bg-orange-50"
          }`}
        >
          {category.name}
        </Button>
      ))}
    </div>
  )
}
