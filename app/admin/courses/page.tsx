// app/admin/courses/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Play,
  Users
} from 'lucide-react'

interface AdminCourse {
  id: string
  title: string
  description: string
  thumbnail?: string
  category: string
  level: string
  isPublished: boolean
  createdAt: string
  videos: { id: string }[]
  _count: { enrollments: number }
}

export default function AdminCoursesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [filteredCourses, setFilteredCourses] = useState<AdminCourse[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchCourses()
  }, [session, router])

  useEffect(() => {
    filterCourses()
  }, [courses, searchTerm])

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/admin/courses')
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterCourses = () => {
    let filtered = courses

    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredCourses(filtered)
  }

  const togglePublished = async (courseId: string, isPublished: boolean) => {
    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !isPublished })
      })

      if (response.ok) {
        setCourses(prev =>
          prev.map(course =>
            course.id === courseId
              ? { ...course, isPublished: !isPublished }
              : course
          )
        )
      }
    } catch (error) {
      console.error('Error updating course:', error)
    }
  }

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCourses(prev => prev.filter(course => course.id !== courseId))
      }
    } catch (error) {
      console.error('Error deleting course:', error)
    }
  }

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-dark-900 mb-2">
              Manage Courses
            </h1>
            <p className="text-lg text-dark-600">
              Create, edit, and manage all courses on the platform.
            </p>
          </div>
          
          <Link href="/admin/courses/create">
            <Button className="flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Create Course
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 w-5 h-5" />
            <Input
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Courses Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCourses.map(course => (
              <Card key={course.id} className="overflow-hidden">
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
                    <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                      <Play className="w-12 h-12 text-primary-600" />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      course.isPublished
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {course.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>

                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-primary-600 font-medium">{course.category}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      course.level === 'BEGINNER' ? 'bg-green-100 text-green-800' :
                      course.level === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {course.level}
                    </span>
                  </div>
                  <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="text-dark-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-dark-500 mb-4">
                    <div className="flex items-center">
                      <Play className="w-4 h-4 mr-1" />
                      {course.videos.length} videos
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {course._count.enrollments} students
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Link href={`/admin/courses/${course.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit className="w-4 h-4 mr-2" />
                        Manage
                      </Button>
                    </Link>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePublished(course.id, course.isPublished)}
                    >
                      {course.isPublished ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCourse(course.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Plus className="w-16 h-16 text-dark-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-dark-700 mb-2">
                No courses found
              </h3>
              <p className="text-dark-500 mb-6">
                {searchTerm ? 'Try adjusting your search criteria.' : 'Create your first course to get started.'}
              </p>
              {!searchTerm && (
                <Link href="/admin/courses/create">
                  <Button>Create First Course</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}