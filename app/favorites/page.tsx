// app/favorites/page.tsx - Fixed favorites page (create this file if missing)
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Heart,
  BookOpen,
  Clock,
  Users,
  Star,
  PlayCircle,
  Loader2,
  ArrowLeft,
  Search,
  Filter,
  X
} from 'lucide-react'
import { formatDuration } from '@/lib/utils'

interface Course {
  id: string
  title: string
  description: string
  thumbnail?: string
  category: string
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  rating: number
  videos: { id: string; duration?: number }[]
  _count: { enrollments: number }
}

interface FavoriteCourse {
  id: string
  courseId: string
  createdAt: string
  course: Course
}

export default function FavoritesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [favorites, setFavorites] = useState<FavoriteCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Fetch favorites
  useEffect(() => {
    if (status === 'authenticated') {
      fetchFavorites()
    }
  }, [status])

  const fetchFavorites = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/user/favorites')
      
      if (!response.ok) {
        throw new Error('Failed to fetch favorites')
      }
      
      const data = await response.json()
      setFavorites(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching favorites:', error)
      setError('Failed to load favorites')
      setFavorites([])
    } finally {
      setLoading(false)
    }
  }

  const removeFavorite = async (courseId: string) => {
    setRemovingId(courseId)
    
    try {
      const response = await fetch('/api/user/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      })

      if (response.ok) {
        setFavorites(prev => prev.filter(fav => fav.courseId !== courseId))
      } else {
        throw new Error('Failed to remove favorite')
      }
    } catch (error) {
      console.error('Error removing favorite:', error)
    } finally {
      setRemovingId(null)
    }
  }

  const getTotalDuration = (course: Course) => {
    return course.videos?.reduce((acc, video) => acc + (video.duration || 0), 0) || 0
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'INTERMEDIATE':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'ADVANCED':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  // Filter favorites
  const filteredFavorites = favorites.filter(favorite => {
    const matchesSearch = !searchTerm || 
      favorite.course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      favorite.course.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'All' || 
      favorite.course.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = ['All', ...Array.from(new Set(favorites.map(fav => fav.course.category)))]

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#001e62]" />
          <p className="text-gray-600">Loading your favorites...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null // Will redirect
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Favorites</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchFavorites} className="bg-[#001e62] hover:bg-[#001e62]/90">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#001e62] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/courses">
                <Button variant="outline" size="sm" className="border-white text-white hover:bg-white hover:text-[#001e62]">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Courses
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">My Favorites</h1>
                <p className="text-blue-200">
                  {favorites.length} course{favorites.length !== 1 ? 's' : ''} saved
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <Heart className="w-8 h-8 text-red-400 fill-current" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {favorites.length === 0 ? (
          // Empty state
          <Card className="border-0 shadow-lg">
            <CardContent className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                No Favorites Yet
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Start exploring courses and add them to your favorites to build your personal learning collection.
              </p>
              <Link href="/courses">
                <Button className="bg-[#001e62] hover:bg-[#001e62]/90">
                  <Search className="w-4 h-4 mr-2" />
                  Browse Courses
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters */}
            <div className="mb-8">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search Favorites
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search by title or description..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001e62] focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Filter by Category
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001e62] focus:border-transparent"
                      >
                        {categories.map(category => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results count */}
            <div className="mb-6">
              <p className="text-gray-600">
                Showing {filteredFavorites.length} of {favorites.length} favorite courses
              </p>
            </div>

            {/* Favorites grid */}
            {filteredFavorites.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="text-center py-12">
                  <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No matches found
                  </h3>
                  <p className="text-gray-600">
                    Try adjusting your search or filter criteria.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredFavorites.map(favorite => (
                  <Card key={favorite.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0">
                    <div className="relative">
                      {favorite.course.thumbnail ? (
                        <div className="relative aspect-video overflow-hidden">
                          <Image
                            src={favorite.course.thumbnail}
                            alt={favorite.course.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-gradient-to-br from-[#001e62]/10 to-blue-100 flex items-center justify-center">
                          <PlayCircle className="w-12 h-12 text-[#001e62]" />
                        </div>
                      )}

                      {/* Remove favorite button */}
                      <button
                        onClick={() => removeFavorite(favorite.courseId)}
                        disabled={removingId === favorite.courseId}
                        className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-lg"
                      >
                        {removingId === favorite.courseId ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                        ) : (
                          <Heart className="w-4 h-4 text-red-500 fill-current" />
                        )}
                      </button>

                      {/* Level badge */}
                      <div className="absolute top-3 left-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getLevelColor(favorite.course.level)}`}>
                          {favorite.course.level}
                        </span>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[#001e62]">
                          {favorite.course.category}
                        </span>
                        <div className="flex items-center text-xs text-gray-500">
                          <Users className="w-3 h-3 mr-1" />
                          {favorite.course._count?.enrollments || 0}
                        </div>
                      </div>

                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
                        {favorite.course.title}
                      </h3>

                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {favorite.course.description}
                      </p>

                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-4">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          <span className="truncate">
                            {formatDuration(getTotalDuration(favorite.course))}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <BookOpen className="w-3 h-3 mr-1" />
                          <span className="truncate">{favorite.course.videos?.length || 0} lessons</span>
                        </div>
                        <div className="flex items-center">
                          <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                          <span>{favorite.course.rating || 4.8}</span>
                        </div>
                      </div>

                      <Link href={`/course/${favorite.courseId}`}>
                        <Button className="w-full bg-[#001e62] hover:bg-[#001e62]/90">
                          Continue Learning
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
