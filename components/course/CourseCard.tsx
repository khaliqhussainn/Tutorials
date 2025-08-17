// components/course/CourseCard.tsx - FIXED VERSION
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Clock,
  Users,
  Star,
  Heart,
  Play,
  BookOpen,
  Loader2,
  PlayCircle
} from 'lucide-react'
import { formatDuration } from '@/lib/utils'

interface Course {
  id: string
  title: string
  description: string
  thumbnail?: string
  category: string
  level: string
  videos: { duration?: number }[]
  _count: { enrollments: number }
}

interface CourseCardProps {
  course: Course
  isFavorite?: boolean
  onToggleFavorite?: (courseId: string) => void
  favoriteLoading?: boolean
  showProgress?: boolean
  progress?: number
  variant?: 'default' | 'compact' | 'featured'
}

export default function CourseCard({
  course,
  isFavorite = false,
  onToggleFavorite,
  favoriteLoading = false,
  showProgress = false,
  progress = 0,
  variant = 'default'
}: CourseCardProps) {
  const [imageError, setImageError] = useState(false)

  const getTotalDuration = () => {
    return course.videos?.reduce((acc, video) => acc + (video.duration || 0), 0) || 0
  }

  const getTotalVideos = () => {
    return course.videos?.length || 0
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'INTERMEDIATE':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'ADVANCED':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onToggleFavorite && !favoriteLoading) {
      onToggleFavorite(course.id)
    }
  }

  const totalDuration = getTotalDuration()
  const totalVideos = getTotalVideos()

  return (
    <Link href={`/course/${course.id}`}>
      <Card className={`group overflow-hidden hover:shadow-xl transition-all duration-500 border-0 bg-white hover:-translate-y-1 ${
        variant === 'featured' ? 'ring-2 ring-blue-600/20' : ''
      } ${variant === 'compact' ? 'h-full' : ''}`}>
        {/* Course Thumbnail */}
        <div className="relative">
          {course.thumbnail && !imageError ? (
            <div className={`relative aspect-video overflow-hidden`}>
              <Image
                src={course.thumbnail}
                alt={course.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ) : (
            <div className="aspect-video bg-gradient-to-br from-blue-600/10 via-blue-600/5 to-blue-100 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-blue-500/10" />
              <PlayCircle className="w-12 h-12 text-blue-600 relative z-10" />
            </div>
          )}

          {/* Level Badge */}
          <div className="absolute top-3 left-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getLevelColor(course.level)}`}>
              {course.level}
            </span>
          </div>

          {/* Favorite Button */}
          {onToggleFavorite && (
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={handleFavoriteClick}
                disabled={favoriteLoading}
                className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-lg disabled:opacity-50"
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {favoriteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                ) : (
                  <Heart
                    className={`w-4 h-4 transition-colors ${
                      isFavorite
                        ? 'fill-red-500 text-red-500'
                        : 'text-gray-600 hover:text-red-500'
                    }`}
                  />
                )}
              </button>
            </div>
          )}

          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
              <Play className="w-8 h-8 text-white fill-current" />
            </div>
          </div>
        </div>

        {/* Course Content */}
        <CardContent className="p-4">
          {/* Category and Enrollment Count */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-600">
              {course.category}
            </span>
            <div className="flex items-center text-xs text-gray-500">
              <Users className="w-3 h-3 mr-1" />
              {course._count?.enrollments || 0}
            </div>
          </div>

          {/* Title */}
          <h3 className={`font-bold text-gray-900 mb-2 line-clamp-2 leading-tight ${
            variant === 'compact' ? 'text-base' : 'text-lg'
          }`}>
            {course.title}
          </h3>

          {/* Description */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {course.description}
          </p>

          {/* Progress Bar (if applicable) */}
          {showProgress && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Course Stats */}
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-4">
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              <span className="truncate">
                {formatDuration(totalDuration)}
              </span>
            </div>
            <div className="flex items-center">
              <BookOpen className="w-3 h-3 mr-1" />
              <span className="truncate">{totalVideos} lessons</span>
            </div>
            <div className="flex items-center">
              <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
              <span>4.8</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              {/* You can add price or other info here */}
            </div>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white border-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Play className="w-3 h-3 mr-1" />
              {showProgress ? 'Continue' : 'Start'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}