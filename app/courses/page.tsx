// app/courses/page.tsx - FIXED with correct color scheme and API calls
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  Search, 
  Filter, 
  Star, 
  TrendingUp, 
  PlayCircle, 
  Clock, 
  BookOpen,
  Users,
  Award,
  ChevronRight,
  Heart,
  Play,
  Target,
  Zap,
  CheckCircle,
  Lock,
  Loader2
} from 'lucide-react'
import { formatDuration, calculateProgress } from '@/lib/utils'

interface Course {
  id: string
  title: string
  description: string
  thumbnail?: string
  category: string
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  isPublished: boolean
  createdAt: string
  sections: {
    id: string
    videos: {
      id: string
      duration?: number
    }[]
  }[]
  videos: {
    id: string
    duration?: number
  }[]
  _count: { enrollments: number }
}

interface UserProgress {
  courseId: string
  progress: number
  lastWatched: string
  course: Course
}

interface Enrollment {
  courseId: string
  enrolledAt: string
}

const categories = ['All', 'Programming', 'Design', 'Business', 'Marketing', 'Data Science', 'Other']
const levels = ['All', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED']

export default function CoursesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([])
  const [continueCourses, setContinueCourses] = useState<UserProgress[]>([])
  const [enrollments, setEnrollments] = useState<string[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedLevel, setSelectedLevel] = useState('All')
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'trending'>('newest')

  useEffect(() => {
    // Get search term from URL if present
    const searchParam = searchParams.get('search')
    if (searchParam) {
      setSearchTerm(searchParam)
    }
    
    fetchCourses()
    fetchFeaturedCourses()
    
    if (session) {
      fetchUserData()
    }
  }, [session, searchParams])

  useEffect(() => {
    filterCourses()
  }, [courses, searchTerm, selectedCategory, selectedLevel, sortBy])

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses')
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched courses:', data)
        setCourses(data)
      } else {
        console.error('Failed to fetch courses:', response.status)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFeaturedCourses = async () => {
    try {
      const response = await fetch('/api/courses?featured=true')
      if (response.ok) {
        const data = await response.json()
        setFeaturedCourses(data.slice(0, 6)) // Get top 6 featured courses
      }
    } catch (error) {
      console.error('Error fetching featured courses:', error)
    }
  }

  const fetchUserData = async () => {
    try {
      // Fetch user enrollments
      const enrollmentsResponse = await fetch('/api/user/enrollments')
      if (enrollmentsResponse.ok) {
        const enrollmentsData = await enrollmentsResponse.json()
        setEnrollments(enrollmentsData.map((e: Enrollment) => e.courseId))
      }

      // Fetch user progress for continue learning section
      const progressResponse = await fetch('/api/user/progress')
      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        setContinueCourses(progressData.filter((item: UserProgress) => 
          item.progress > 0 && item.progress < 100
        ).slice(0, 3))
      }

      // Fetch user favorites
      const favoritesResponse = await fetch('/api/user/favorites')
      if (favoritesResponse.ok) {
        const favoritesData = await favoritesResponse.json()
        setFavorites(favoritesData.map((fav: any) => fav.courseId))
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const filterCourses = () => {
    let filtered = courses

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(course => course.category === selectedCategory)
    }

    // Apply level filter
    if (selectedLevel !== 'All') {
      filtered = filtered.filter(course => course.level === selectedLevel)
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b._count.enrollments - a._count.enrollments
        case 'trending':
          return b._count.enrollments - a._count.enrollments // Simple trending logic
        case 'newest':
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      }
    })

    setFilteredCourses(filtered)
  }

  const toggleFavorite = async (courseId: string) => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    try {
      const method = favorites.includes(courseId) ? 'DELETE' : 'POST'
      const response = await fetch('/api/user/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      })

      if (response.ok) {
        setFavorites(prev =>
          prev.includes(courseId)
            ? prev.filter(id => id !== courseId)
            : [...prev, courseId]
        )
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const getTotalDuration = (course: Course) => {
    const sectionDuration = course.sections?.reduce((acc, section) =>
      acc + section.videos.reduce((videoAcc, video) => videoAcc + (video.duration || 0), 0), 0
    ) || 0
    const legacyDuration = course.videos?.reduce((acc, video) => acc + (video.duration || 0), 0) || 0
    return sectionDuration + legacyDuration
  }

  const getTotalVideos = (course: Course) => {
    const sectionVideos = course.sections?.reduce((acc, section) => acc + section.videos.length, 0) || 0
    const legacyVideos = course.videos?.length || 0
    return sectionVideos + legacyVideos
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER':
        return 'bg-green-100 text-green-800'
      case 'INTERMEDIATE':
        return 'bg-yellow-100 text-yellow-800'
      case 'ADVANCED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const CourseCard = ({ course, featured = false }: { course: Course, featured?: boolean }) => {
    const isEnrolled = enrollments.includes(course.id)
    const isFavorited = favorites.includes(course.id)
    const totalDuration = getTotalDuration(course)
    const totalVideos = getTotalVideos(course)

    return (
      <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 ${featured ? 'border-purple-200' : ''}`}>
        <div className="relative">
          {course.thumbnail ? (
            <div className="relative aspect-video">
              <Image
                src={course.thumbnail}
                alt={course.title}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video bg-gradient-to-br from-purple-100 to-blue-200 flex items-center justify-center">
              <Play className="w-12 h-12 text-purple-600" />
            </div>
          )}

          {/* Overlay badges */}
          <div className="absolute top-3 left-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(course.level)}`}>
              {course.level}
            </span>
          </div>

          {featured && (
            <div className="absolute top-3 right-3">
              <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </span>
            </div>
          )}

          {/* Favorite button */}
          {session && (
            <button
              onClick={(e) => {
                e.preventDefault()
                toggleFavorite(course.id)
              }}
              className="absolute bottom-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
            >
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
            </button>
          )}

          {/* Enrollment status */}
          {isEnrolled && (
            <div className="absolute bottom-3 left-3">
              <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" />
                Enrolled
              </span>
            </div>
          )}
        </div>

        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-purple-600 font-medium">{course.category}</span>
            <div className="flex items-center text-xs text-gray-500">
              <Users className="w-3 h-3 mr-1" />
              {course._count.enrollments}
            </div>
          </div>
          <CardTitle className="text-lg line-clamp-2 leading-tight">
            {course.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>

          <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {formatDuration(totalDuration)}
            </div>
            <div className="flex items-center">
              <BookOpen className="w-3 h-3 mr-1" />
              {totalVideos} lessons
            </div>
            <div className="flex items-center">
              <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
              4.8
            </div>
          </div>

          <Link href={`/course/${course.id}`} className="block">
            <Button className="w-full bg-purple-600 hover:bg-purple-700" variant={isEnrolled ? "outline" : "primary"}>
              {isEnrolled ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Continue Learning
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Enroll Now - Free
                </>
              )}
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading courses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Master New Skills
            </h1>
            <p className="text-xl md:text-2xl text-purple-100 mb-8 max-w-3xl mx-auto">
              Discover our comprehensive course library designed by industry experts. 
              Learn at your own pace with interactive lessons and AI-powered assessments.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
              <Input
                placeholder="What would you like to learn today?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 py-4 text-lg bg-white border-0 shadow-lg text-gray-900 placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold mb-1">{courses.length}+</div>
              <div className="text-purple-200">Courses</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">50k+</div>
              <div className="text-purple-200">Students</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">95%</div>
              <div className="text-purple-200">Success Rate</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">4.8★</div>
              <div className="text-purple-200">Rating</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Continue Learning Section */}
        {session && continueCourses.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <PlayCircle className="w-6 h-6 text-purple-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Continue Learning</h2>
              </div>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  View All Progress
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {continueCourses.map((userProgress) => (
                <Card key={userProgress.courseId} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {userProgress.course.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {userProgress.course.category} • {userProgress.course.level}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>Progress</span>
                        <span className="font-medium">{Math.round(userProgress.progress)}% complete</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${userProgress.progress}%` }}
                        />
                      </div>
                    </div>
                    
                    <Link href={`/course/${userProgress.courseId}`}>
                      <Button className="w-full bg-purple-600 hover:bg-purple-700">
                        <Play className="w-4 h-4 mr-2" />
                        Continue Learning
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Featured Courses Section */}
        {featuredCourses.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Star className="w-6 h-6 text-yellow-500 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Featured Courses</h2>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                Trending Now
              </div>
            </div>
            
            {/* Hero Featured Course */}
            {featuredCourses[0] && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-8 mb-8">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="inline-flex items-center bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                      {featuredCourses[0].title}
                    </h3>
                    <p className="text-gray-700 mb-6 text-lg">
                      {featuredCourses[0].description}
                    </p>
                    <div className="flex items-center gap-6 mb-6">
                      <div className="flex items-center text-gray-600">
                        <Clock className="w-5 h-5 mr-2" />
                        <span>{formatDuration(getTotalDuration(featuredCourses[0]))}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <BookOpen className="w-5 h-5 mr-2" />
                        <span>{getTotalVideos(featuredCourses[0])} lessons</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Users className="w-5 h-5 mr-2" />
                        <span>{featuredCourses[0]._count.enrollments} students</span>
                      </div>
                    </div>
                    <Link href={`/course/${featuredCourses[0].id}`}>
                      <Button size="lg" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                        <Zap className="w-5 h-5 mr-2" />
                        Start Learning Now
                      </Button>
                    </Link>
                  </div>
                  <div className="relative">
                    <div className="aspect-video bg-gradient-to-br from-yellow-200 to-orange-200 rounded-xl overflow-hidden">
                      {featuredCourses[0].thumbnail ? (
                        <Image 
                          src={featuredCourses[0].thumbnail} 
                          alt={featuredCourses[0].title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PlayCircle className="w-20 h-20 text-yellow-600" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Featured Courses */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredCourses.slice(1, 5).map(course => (
                <CourseCard key={course.id} course={course} featured={true} />
              ))}
            </div>
          </section>
        )}

        {/* Filters Section */}
        <section className="mb-8">
          <Card className="p-6">
            <div className="flex flex-col xl:flex-row gap-6">
              {/* Category Filter */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className={`transition-all ${selectedCategory === category ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Level Filter */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Difficulty Level</h3>
                <div className="flex flex-wrap gap-2">
                  {levels.map(level => (
                    <Button
                      key={level}
                      variant={selectedLevel === level ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedLevel(level)}
                      className={`transition-all ${selectedLevel === level ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Sort Filter */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sort By</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="popular">Most Popular</option>
                  <option value="trending">Trending</option>
                </select>
              </div>
            </div>
          </Card>
        </section>

        {/* Results */}
        <section className="mb-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-lg">
              Showing <span className="font-semibold">{filteredCourses.length}</span> of <span className="font-semibold">{courses.length}</span> courses
            </p>
            {(searchTerm || selectedCategory !== 'All' || selectedLevel !== 'All') && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('All')
                  setSelectedLevel('All')
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </section>

        {/* All Courses Grid */}
        <section>
          {filteredCourses.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCourses.map(course => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-16">
                <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No courses found</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {searchTerm 
                    ? `No courses match "${searchTerm}". Try adjusting your search or filters.`
                    : 'No published courses are available yet.'
                  }
                </p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedCategory('All')
                    setSelectedLevel('All')
                  }}
                >
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* CTA Section */}
        <section className="mt-16">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-8 md:p-12 text-white text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Start Your Learning Journey?
            </h2>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              Join thousands of students who are already advancing their careers with our expert-led courses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!session ? (
                <>
                  <Link href="/auth/signin">
                    <Button size="lg" variant="secondary">
                      Sign In to Continue
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-purple-600">
                      Create Free Account
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href="#courses">
                  <Button size="lg" variant="secondary">
                    <Award className="w-5 h-5 mr-2" />
                    Explore All Courses
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}