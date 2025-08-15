'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Heart,
  Clock,
  Users,
  Star,
  BookOpen,
  Play,
  HeartOff,
  Search,
  Filter,
  Grid3X3,
  List,
  Loader2,
  AlertCircle,
  TrendingUp,
  Award,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDuration } from '@/lib/utils'

interface FavoriteCourse {
  id: string
  userId: string
  courseId: string
  createdAt: string
  course: {
    id: string
    title: string
    description: string
    thumbnail?: string
    category: string
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
    price: number
    isFree: boolean
    rating: number
    videos: { id: string; duration: number | null }[]
    _count: { enrollments: number }
  }
}

export default function FavoritesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [favorites, setFavorites] = useState<FavoriteCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [removingFavorite, setRemovingFavorite] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'level'>('recent')

  useEffect(() => {
    if (session) {
      fetchFavorites()
    }
  }, [session])

  const fetchFavorites = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/favorites')
      if (!response.ok) {
        throw new Error('Failed to fetch favorites')
      }
      const data = await response.json()
      setFavorites(data)
    } catch (error) {
      console.error('Error fetching favorites:', error)
      toast.error('Failed to load favorites')
    } finally {
      setLoading(false)
    }
  }

  const removeFavorite = async (courseId: string) => {
    setRemovingFavorite(courseId)
    try {
      const response = await fetch('/api/user/favorites', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove favorite')
      }

      setFavorites(prev => prev.filter(fav => fav.courseId !== courseId))
      toast.success('Removed from favorites')
    } catch (error) {
      console.error('Error removing favorite:', error)
      toast.error('Failed to remove favorite')
    } finally {
      setRemovingFavorite(null)
    }
  }

  const calculateTotalDuration = (videos: { duration: number | null }[]) => {
    const totalSeconds = videos.reduce((acc, video) => {
      return acc + (video.duration || 0)
    }, 0)
    return totalSeconds
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER': return 'bg-green-100 text-green-800'
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800'
      case 'ADVANCED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getUniqueCategories = () => {
    const categories = favorites.map(fav => fav.course.category)
    return [...new Set(categories)]
  }

  const filteredAndSortedFavorites = favorites
    .filter(fav => {
      const matchesSearch = fav.course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           fav.course.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || fav.course.category === selectedCategory
      const matchesLevel = selectedLevel === 'all' || fav.course.level === selectedLevel
      return matchesSearch && matchesCategory && matchesLevel
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'title':
          return a.course.title.localeCompare(b.course.title)
        case 'level':
          const levelOrder = { 'BEGINNER': 1, 'INTERMEDIATE': 2, 'ADVANCED': 3 }
          return levelOrder[a.course.level] - levelOrder[b.course.level]
        default:
          return 0
      }
    })

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center mb-6 lg:mb-0">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mr-4">
                <Heart className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
                <p className="text-gray-600 mt-1">
                  {favorites.length} course{favorites.length !== 1 ? 's' : ''} saved for later
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            {favorites.length > 0 && (
              <div className="grid grid-cols-3 gap-4 lg:gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{favorites.length}</div>
                  <div className="text-sm text-gray-600">Total Courses</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {getUniqueCategories().length}
                  </div>
                  <div className="text-sm text-gray-600">Categories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatDuration(
                      favorites.reduce((acc, fav) => acc + calculateTotalDuration(fav.course.videos), 0)
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Total Duration</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">Loading your favorites...</span>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No favorites yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start exploring courses and add them to your favorites to see them here. 
              Favorites help you keep track of courses you want to take later.
            </p>
            <Link href="/courses">
              <Button className="bg-[#001e62] hover:bg-[#001e62]/90">
                <Search className="w-4 h-4 mr-2" />
                Browse Courses
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Filters and Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Search */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search favorites..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62]"
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62] text-sm"
                  >
                    <option value="all">All Categories</option>
                    {getUniqueCategories().map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>

                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62] text-sm"
                  >
                    <option value="all">All Levels</option>
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'recent' | 'title' | 'level')}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62] text-sm"
                  >
                    <option value="recent">Recently Added</option>
                    <option value="title">Title A-Z</option>
                    <option value="level">Level</option>
                  </select>

                  {/* View Mode Toggle */}
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 ${viewMode === 'grid' ? 'bg-[#001e62] text-white' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 ${viewMode === 'list' ? 'bg-[#001e62] text-white' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Results count */}
              <div className="mt-4 text-sm text-gray-600">
                Showing {filteredAndSortedFavorites.length} of {favorites.length} favorite{favorites.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Courses Grid/List */}
            {filteredAndSortedFavorites.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }>
                {filteredAndSortedFavorites.map((favorite) => (
                  <Card key={favorite.id} className={`group hover:shadow-lg transition-all duration-200 border-gray-200 ${
                    viewMode === 'list' ? 'flex flex-row' : ''
                  }`}>
                    <div className={viewMode === 'list' ? 'flex w-full' : ''}>
                      {/* Course Thumbnail */}
                      <div className={`relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : ''}`}>
                        <div className={`relative ${viewMode === 'list' ? 'h-32' : 'h-48'} bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg ${viewMode === 'list' ? 'rounded-l-lg rounded-tr-none' : ''} overflow-hidden`}>
                          {favorite.course.thumbnail ? (
                            <img 
                              src={favorite.course.thumbnail} 
                              alt={favorite.course.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                          
                          {/* Remove from favorites button */}
                          <button
                            onClick={() => removeFavorite(favorite.courseId)}
                            disabled={removingFavorite === favorite.courseId}
                            className="absolute top-3 right-3 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110 shadow-lg"
                          >
                            {removingFavorite === favorite.courseId ? (
                              <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
                            ) : (
                              <Heart className="w-5 h-5 text-red-500 fill-current" />
                            )}
                          </button>

                          {/* Play overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 transform scale-75 group-hover:scale-100">
                              <Play className="w-6 h-6 text-[#001e62] ml-1" />
                            </div>
                          </div>

                          {/* Course level badge */}
                          <div className="absolute bottom-3 left-3">
                            <Badge className={`text-xs ${getLevelColor(favorite.course.level)}`}>
                              {favorite.course.level}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Course Content */}
                      <CardContent className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs text-[#001e62] border-[#001e62]">
                              {favorite.course.category}
                            </Badge>
                            <div className="flex items-center text-yellow-500">
                              <Star className="w-4 h-4 fill-current" />
                              <span className="text-sm font-medium ml-1">{favorite.course.rating}</span>
                            </div>
                          </div>
                          
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#001e62] transition-colors">
                            {favorite.course.title}
                          </h3>
                          
                          <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                            {favorite.course.description}
                          </p>

                          <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {formatDuration(calculateTotalDuration(favorite.course.videos))}
                            </div>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {favorite.course._count.enrollments} enrolled
                            </div>
                          </div>

                          <div className="text-xs text-gray-400 mb-4">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            Added {new Date(favorite.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {favorite.course.isFree ? (
                              <span className="text-lg font-bold text-green-600">Free</span>
                            ) : (
                              <span className="text-lg font-bold text-gray-900">
                                ${favorite.course.price}
                              </span>
                            )}
                          </div>
                          
                          <Link href={`/course/${favorite.course.id}`}>
                            <Button 
                              size="sm" 
                              className="bg-[#001e62] hover:bg-[#001e62]/90 text-white"
                            >
                              View Course
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Call to Action */}
            {filteredAndSortedFavorites.length > 0 && (
              <div className="mt-12 bg-gradient-to-r from-[#001e62] to-blue-700 rounded-2xl p-8 text-white text-center">
                <h3 className="text-2xl font-bold mb-4">Ready to start learning?</h3>
                <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                  You have {favorites.length} amazing course{favorites.length !== 1 ? 's' : ''} saved in your favorites. 
                  Pick one and start your learning journey today!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/courses">
                    <Button variant="secondary" className="bg-white text-[#001e62] hover:bg-gray-100">
                      <Search className="w-4 h-4 mr-2" />
                      Browse More Courses
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="outline" className="border-white text-white hover:bg-white/10">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      View My Progress
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}