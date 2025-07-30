// app/admin/courses/page.tsx - Fixed version with working publish/draft
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
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  BookOpen,
  TrendingUp,
  Filter,
  MoreVertical,
  Copy,
  Settings
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
  updatedAt: string
  videos: { id: string }[]
  sections: { id: string; videos: { id: string }[] }[]
  _count: { enrollments: number }
}

export default function AdminCoursesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [filteredCourses, setFilteredCourses] = useState<AdminCourse[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (session?.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchCourses()
  }, [session, router])

  useEffect(() => {
    filterCourses()
  }, [courses, searchTerm, filterStatus])

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/admin/courses')
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
      } else {
        setError('Failed to fetch courses')
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
      setError('Failed to fetch courses')
    } finally {
      setLoading(false)
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

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(course => 
        filterStatus === 'published' ? course.isPublished : !course.isPublished
      )
    }

    setFilteredCourses(filtered)
  }

  const togglePublished = async (courseId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    const action = newStatus ? 'publish' : 'unpublish'
    
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: newStatus })
      })

      if (response.ok) {
        const updatedCourse = await response.json()
        
        // Update local state
        setCourses(prev =>
          prev.map(course =>
            course.id === courseId
              ? { ...course, isPublished: newStatus, updatedAt: updatedCourse.updatedAt }
              : course
          )
        )

        setSuccess(`Course ${action}ed successfully!`)
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || `Failed to ${action} course`)
      }
    } catch (error) {
      console.error(`Error ${action}ing course:`, error)
      setError(`Failed to ${action} course`)
    }
  }

  const duplicateCourse = async (courseId: string) => {
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/duplicate`, {
        method: 'POST'
      })

      if (response.ok) {
        const duplicatedCourse = await response.json()
        setCourses(prev => [...prev, duplicatedCourse])
        setSuccess('Course duplicated successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to duplicate course')
      }
    } catch (error) {
      console.error('Error duplicating course:', error)
      setError('Failed to duplicate course')
    }
  }

  const deleteCourse = async (courseId: string) => {
    const course = courses.find(c => c.id === courseId)
    
    if (!confirm(`Are you sure you want to delete "${course?.title}"? This action cannot be undone and will remove all videos and student progress.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCourses(prev => prev.filter(course => course.id !== courseId))
        setSuccess('Course deleted successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to delete course')
      }
    } catch (error) {
      console.error('Error deleting course:', error)
      setError('Failed to delete course')
    }
  }

  const getTotalVideos = (course: AdminCourse) => {
    const sectionVideos = course.sections?.reduce((acc, section) => acc + section.videos.length, 0) || 0
    const legacyVideos = course.videos?.length || 0
    return sectionVideos + legacyVideos
  }

  const getStatusColor = (isPublished: boolean) => {
    return isPublished
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER':
        return 'bg-blue-100 text-blue-800'
      case 'INTERMEDIATE':
        return 'bg-orange-100 text-orange-800'
      case 'ADVANCED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading courses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-2">
                Course Management
              </h1>
              <p className="text-lg text-gray-600">
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

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Total Courses</p>
                    <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Eye className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Published</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {courses.filter(c => c.isPublished).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-yellow-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Drafts</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {courses.filter(c => !c.isPublished).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {courses.reduce((acc, course) => acc + course._count.enrollments, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="mb-6 flex items-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search courses by title, description, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'published' | 'draft')}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Courses</option>
              <option value="published">Published Only</option>
              <option value="draft">Drafts Only</option>
            </select>
          </div>
        </div>

        {/* Courses Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCourses.map(course => (
              <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(course.isPublished)}`}>
                      {course.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>

                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-primary-600 font-medium">{course.category}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(course.level)}`}>
                      {course.level}
                    </span>
                  </div>
                  <CardTitle className="text-lg line-clamp-2 hover:line-clamp-none transition-all">
                    {course.title}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center">
                        <Play className="w-4 h-4 mr-1" />
                        {getTotalVideos(course)} videos
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {course._count.enrollments} students
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      Updated {formatDate(course.updatedAt)}
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
                      className="flex-shrink-0"
                      title={course.isPublished ? 'Unpublish course' : 'Publish course'}
                    >
                      {course.isPublished ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>

                    <div className="relative group">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                      
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                        <div className="py-1 min-w-32">
                          <button
                            onClick={() => duplicateCourse(course.id)}
                            className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </button>
                          <Link
                            href={`/course/${course.id}`}
                            className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </Link>
                          <button
                            onClick={() => deleteCourse(course.id)}
                            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              {searchTerm || filterStatus !== 'all' ? (
                <>
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No courses found
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Try adjusting your search criteria or filters.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('')
                      setFilterStatus('all')
                    }}
                  >
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <Plus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No courses yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Create your first course to get started with the platform.
                  </p>
                  <Link href="/admin/courses/create">
                    <Button>Create First Course</Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}