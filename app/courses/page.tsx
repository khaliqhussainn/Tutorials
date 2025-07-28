// app/courses/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import CourseCard from '@/components/course/CourseCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Search, Filter, Star, TrendingUp, PlayCircle, Clock, BookOpen } from 'lucide-react'
import Link from 'next/link'

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

interface UserProgress {
  courseId: string
  progress: number
  lastWatched: string
  course: Course
}

const categories = ['All', 'Programming', 'Design', 'Business', 'Marketing', 'Data Science']
const levels = ['All', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED']

export default function CoursesPage() {
  const { data: session } = useSession()
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [topPickCourses, setTopPickCourses] = useState<Course[]>([])
  const [resumeCourses, setResumeCourses] = useState<UserProgress[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedLevel, setSelectedLevel] = useState('All')

  useEffect(() => {
    fetchCourses()
    fetchTopPicks()
    if (session) {
      fetchFavorites()
      fetchResumeCourses()
    }
    
    // Handle search from URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const searchParam = urlParams.get('search')
    if (searchParam) {
      setSearchTerm(searchParam)
    }
  }, [session])

  useEffect(() => {
    filterCourses()
  }, [courses, searchTerm, selectedCategory, selectedLevel])

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses')
      const data = await response.json()
      setCourses(data)
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTopPicks = async () => {
    try {
      const response = await fetch('/api/courses/top-picks')
      if (response.ok) {
        const data = await response.json()
        setTopPickCourses(data)
      }
    } catch (error) {
      console.error('Error fetching top picks:', error)
    }
  }

  const fetchResumeCourses = async () => {
    try {
      const response = await fetch('/api/user/progress')
      if (response.ok) {
        const data = await response.json()
        setResumeCourses(data.filter((item: UserProgress) => item.progress > 0 && item.progress < 100))
      }
    } catch (error) {
      console.error('Error fetching resume courses:', error)
    }
  }

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/user/favorites')
      if (response.ok) {
        const data = await response.json()
        setFavorites(data.map((fav: any) => fav.courseId))
      }
    } catch (error) {
      console.error('Error fetching favorites:', error)
    }
  }

  const filterCourses = () => {
    let filtered = courses

    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(course => course.category === selectedCategory)
    }

    if (selectedLevel !== 'All') {
      filtered = filtered.filter(course => course.level === selectedLevel)
    }

    setFilteredCourses(filtered)
  }

  const toggleFavorite = async (courseId: string) => {
    if (!session) return

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading courses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Explore Our Courses
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto">
              Master new skills with our comprehensive course library designed by industry experts
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="What would you like to learn today?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 py-4 text-lg bg-white border-0 shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Filters Section */}
        <section className="mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter by Category</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="transition-all"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter by Level</h3>
                <div className="flex flex-wrap gap-2">
                  {levels.map(level => (
                    <Button
                      key={level}
                      variant={selectedLevel === level ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedLevel(level)}
                      className="transition-all"
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
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

        {/* Course Grid */}
        <section className="mb-12">
          {filteredCourses.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCourses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isFavorite={favorites.includes(course.id)}
                  onToggleFavorite={session ? toggleFavorite : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl">
              <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No courses found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your search or filter criteria.</p>
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
            </div>
          )}
        </section>

        {/* Resume Learning Section */}
        {session && resumeCourses.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <PlayCircle className="w-6 h-6 text-primary-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Continue Learning</h2>
              </div>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  View All Progress
                </Button>
              </Link>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resumeCourses.slice(0, 3).map((userProgress) => (
                <div key={userProgress.courseId} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
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
                      <span>{Math.round(userProgress.progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${userProgress.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <Link href={`/course/${userProgress.courseId}`}>
                    <Button className="w-full">
                      Continue Learning
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top Picks Section */}
        {topPickCourses.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Star className="w-6 h-6 text-yellow-500 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Our Top Picks for You</h2>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                Trending Now
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-8 mb-8">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
                    <Star className="w-4 h-4 mr-1" />
                    Featured Course
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">
                    {topPickCourses[0]?.title}
                  </h3>
                  <p className="text-gray-700 mb-6 text-lg">
                    {topPickCourses[0]?.description}
                  </p>
                  <div className="flex items-center gap-6 mb-6">
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-5 h-5 mr-2" />
                      <span>12 hours</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <BookOpen className="w-5 h-5 mr-2" />
                      <span>{topPickCourses[0]?.videos?.length || 0} lessons</span>
                    </div>
                  </div>
                  <Link href={`/course/${topPickCourses[0]?.id}`}>
                    <Button size="lg" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                      Start Learning Now
                    </Button>
                  </Link>
                </div>
                <div className="relative">
                  <div className="aspect-video bg-gradient-to-br from-yellow-200 to-orange-200 rounded-xl flex items-center justify-center">
                    {topPickCourses[0]?.thumbnail ? (
                      <img 
                        src={topPickCourses[0].thumbnail} 
                        alt={topPickCourses[0].title}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <PlayCircle className="w-20 h-20 text-yellow-600" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Top Picks */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {topPickCourses.slice(1, 5).map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isFavorite={favorites.includes(course.id)}
                  onToggleFavorite={session ? toggleFavorite : undefined}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}