// components/course/CourseCard.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Clock, Users, Star, Heart, PlayCircle, Award } from 'lucide-react'
import { formatDuration } from '@/lib/utils'
import { useState } from 'react'

interface CourseCardProps {
  course: {
    id: string
    title: string
    description: string
    thumbnail?: string
    category: string
    level: string
    videos: { duration?: number }[]
    _count: { enrollments: number }
  }
  isFavorite?: boolean
  onToggleFavorite?: (courseId: string) => void
  showProgress?: boolean
  progress?: number
}

export default function CourseCard({ 
  course, 
  isFavorite, 
  onToggleFavorite, 
  showProgress = false, 
  progress = 0 
}: CourseCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  const totalDuration = course.videos.reduce((acc, video) => acc + (video.duration || 0), 0)
  
  const handleFavoriteToggle = async () => {
    if (!onToggleFavorite) return
    
    setIsLoading(true)
    try {
      await onToggleFavorite(course.id)
    } finally {
      setIsLoading(false)
    }
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

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'BEGINNER':
        return '🌱'
      case 'INTERMEDIATE':
        return '🚀'
      case 'ADVANCED':
        return '🏆'
      default:
        return '📚'
    }
  }

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white border-0 shadow-md overflow-hidden">
      <CardHeader className="p-0 relative">
        <div className="relative aspect-video overflow-hidden">
          {course.thumbnail && !imageError ? (
            <Image
              src={course.thumbnail}
              alt={course.title}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-100 via-primary-50 to-secondary-100 flex items-center justify-center relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 left-4 w-8 h-8 border-2 border-primary-300 rounded-full"></div>
                <div className="absolute top-8 right-8 w-6 h-6 border-2 border-secondary-300 rounded-full"></div>
                <div className="absolute bottom-6 left-8 w-4 h-4 bg-primary-300 rounded-full"></div>
                <div className="absolute bottom-8 right-6 w-12 h-12 border-2 border-secondary-300 rounded-full"></div>
              </div>
              
              <div className="text-center z-10">
                <div className="w-16 h-16 bg-primary-200 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <PlayCircle className="w-8 h-8 text-primary-600" />
                </div>
                <span className="text-primary-700 text-sm font-medium">
                  {course.category}
                </span>
              </div>
            </div>
          )}
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Favorite Button */}
          {onToggleFavorite && (
            <button
              onClick={handleFavoriteToggle}
              disabled={isLoading}
              className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white hover:scale-110 transition-all duration-200 shadow-lg"
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600 hover:text-red-500'
                }`}
              />
            </button>
          )}
          
          {/* Level Badge */}
          <div className="absolute bottom-3 left-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm ${getLevelColor(course.level)}`}>
              {getLevelIcon(course.level)} {course.level}
            </span>
          </div>

          {/* Progress Bar (if applicable) */}
          {showProgress && progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
              <div 
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Category and Rating */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-primary-600 font-medium bg-primary-50 px-2 py-1 rounded">
            {course.category}
          </span>
          <div className="flex items-center text-sm text-gray-500">
            <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">4.8</span>
          </div>
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {course.title}
        </h3>
        
        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
          {course.description}
        </p>
        
        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1.5" />
            <span>{formatDuration(totalDuration)}</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1.5" />
            <span>{course._count.enrollments.toLocaleString()} students</span>
          </div>
          <div className="flex items-center">
            <PlayCircle className="w-4 h-4 mr-1.5" />
            <span>{course.videos.length} lessons</span>
          </div>
        </div>

        {/* Progress Section (if applicable) */}
        {showProgress && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span className="flex items-center">
                <Award className="w-4 h-4 mr-1" />
                Progress
              </span>
              <span className="font-semibold">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Action Button */}
        <Link href={`/course/${course.id}`}>
          <Button className="w-full group-hover:bg-primary-700 transition-colors duration-200 font-semibold">
            {showProgress && progress > 0 ? (
              <>
                <PlayCircle className="w-4 h-4 mr-2" />
                Continue Learning
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4 mr-2" />
                Start Course
              </>
            )}
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}