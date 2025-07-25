// app/courses/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import CourseCard from '@/components/course/CourseCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Search, Filter } from 'lucide-react'

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

const categories = ['All', 'Programming', 'Design', 'Business', 'Marketing', 'Data Science']
const levels = ['All', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED']

export default function CoursesPage() {
  const { data: session } = useSession()
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedLevel, setSelectedLevel] = useState('All')

  useEffect(() => {
    fetchCourses()
    if (session) {
      fetchFavorites()
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-dark-600">Loading courses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-dark-900 mb-4">
            Explore Courses
          </h1>
          <p className="text-lg text-dark-600">
            Discover our wide range of courses designed to help you master new skills.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 w-5 h-5" />
            <Input
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-dark-700 self-center mr-2">Category:</span>
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-dark-700 self-center mr-2">Level:</span>
              {levels.map(level => (
                <Button
                  key={level}
                  variant={selectedLevel === level ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLevel(level)}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mb-6">
          <p className="text-dark-600">
            Showing {filteredCourses.length} of {courses.length} courses
          </p>
        </div>

        {/* Course Grid */}
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
          <div className="text-center py-12">
            <Filter className="w-16 h-16 text-dark-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-dark-700 mb-2">No courses found</h3>
            <p className="text-dark-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}