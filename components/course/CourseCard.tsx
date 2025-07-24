// components/course/CourseCard.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Clock, Users, Star, Heart } from 'lucide-react'
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
}

export default function CourseCard({ course, isFavorite, onToggleFavorite }: CourseCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  
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

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="p-0">
        <div className="relative aspect-video overflow-hidden rounded-t-lg">
          {course.thumbnail ? (
            <Image
              src={course.thumbnail}
              alt={course.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
              <span className="text-primary-600 text-lg font-semibold">
                {course.title.charAt(0)}
              </span>
            </div>
          )}
          
          {/* Favorite Button */}
          {onToggleFavorite && (
            <button
              onClick={handleFavoriteToggle}
              disabled={isLoading}
              className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
            >
              <Heart
                className={`w-4 h-4 ${
                  isFavorite ? 'fill-red-500 text-red-500' : 'text-dark-600'
                }`}
              />
            </button>
          )}
          
          {/* Level Badge */}
          <div className="absolute bottom-3 left-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              course.level === 'BEGINNER' ? 'bg-green-100 text-green-800' :
              course.level === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {course.level}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-primary-600 font-medium">{course.category}</span>
          <div className="flex items-center text-sm text-dark-500">
            <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
            4.8
          </div>
        </div>
        
        <CardTitle className="text-lg mb-2 line-clamp-2">{course.title}</CardTitle>
        
        <p className="text-dark-600 text-sm mb-4 line-clamp-2">{course.description}</p>
        
        <div className="flex items-center justify-between text-sm text-dark-500 mb-4">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {formatDuration(totalDuration)}
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {course._count.enrollments} students
          </div>
        </div>
        
        <Link href={`/course/${course.id}`}>
          <Button className="w-full">
            View Course
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}