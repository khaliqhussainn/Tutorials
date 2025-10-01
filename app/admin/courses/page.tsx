// app/admin/courses/page.tsx - Styled to match admin dashboard
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
  Filter,
  AlertTriangle,
  Loader2,
  X,
  TrendingUp,
  MessageSquare,
  Activity,
  Globe
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
  sections: {
    id: string
    videos: { id: string; duration?: number }[]
  }[]
  videos: { id: string; duration?: number }[]
  _count: { 
    enrollments: number
    questions?: number
    unansweredQuestions?: number
  }
  totalVideos?: number
  totalDuration?: number
}

interface AdminStats {
  totalQuestions: number
  unansweredQuestions: number
  totalAnnouncements: number
  recentActivity: number
}

// Confirmation Modal Component
function DeleteConfirmationModal({ 
  course, 
  onConfirm, 
  onCancel, 
  isDeleting 
}: { 
  course: AdminCourse
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}) {
  const [confirmText, setConfirmText] = useState('')
  const isConfirmed = confirmText === 'DELETE'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Delete Course</h3>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-700 mb-3">
            Are you sure you want to delete <strong>"{course.title}"</strong>?
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800 font-medium mb-2">This action will permanently delete:</p>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• {course.totalVideos || 0} videos and all content</li>
              <li>• All student progress and quiz data</li>
              <li>• {course._count.enrollments} student enrollments</li>
              <li>• All sections and course structure</li>
              <li>• All Q&A questions and answers</li>
              <li>• All course announcements</li>
            </ul>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">
            Type <strong>DELETE</strong> to confirm this action:
          </p>
          
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="mb-4"
            disabled={isDeleting}
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          
          <Button
            onClick={onConfirm}
            disabled={!isConfirmed || isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Course
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
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
  const [courseToDelete, setCourseToDelete] = useState<AdminCourse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [stats, setStats] = useState<AdminStats>({
    totalQuestions: 0,
    unansweredQuestions: 0,
    totalAnnouncements: 0,
    recentActivity: 0
  })

  useEffect(() => {
    if (session?.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchCourses()
    fetchStats()
  }, [session, router])

  useEffect(() => {
    filterCourses()
  }, [courses, searchTerm, filterStatus])

  const fetchCourses = async () => {
    try {
      setError('')
      const response = await fetch('/api/admin/courses')
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch courses')
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
      setError('Failed to fetch courses')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
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
      setError('')
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: newStatus })
      })

      if (response.ok) {
        const updatedCourse = await response.json()
        
        setCourses(prev =>
          prev.map(course =>
            course.id === courseId
              ? { ...course, isPublished: newStatus, updatedAt: updatedCourse.updatedAt }
              : course
          )
        )

        setSuccess(`Course ${action}ed successfully!`)
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

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return

    setIsDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/courses/${courseToDelete.id}`, {
        method: 'DELETE'
      })

      const responseData = await response.json()

      if (response.ok) {
        setCourses(prev => prev.filter(course => course.id !== courseToDelete.id))
        setSuccess(responseData.message || 'Course deleted successfully!')
        setCourseToDelete(null)
        setTimeout(() => setSuccess(''), 5000)
        fetchStats()
      } else {
        setError(responseData.error || 'Failed to delete course')
      }
    } catch (error) {
      console.error('Error deleting course:', error)
      setError('Failed to delete course. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const getTotalVideos = (course: AdminCourse) => {
    return course.totalVideos || 
      (course.sections?.reduce((acc, section) => acc + section.videos.length, 0) || 0) + 
      (course.videos?.length || 0)
  }

  const getTotalDuration = (course: AdminCourse) => {
    return course.totalDuration || 
      ([
        ...(course.sections?.flatMap(section => section.videos) || []),
        ...(course.videos || [])
      ].reduce((acc, video) => acc + (video.duration || 0), 0))
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

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#001e62]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Header */}
      <div className="bg-[#001e62] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3">
                Course Management
              </h1>
              <p className="text-xl text-blue-100 mb-6">
                Create, edit, and manage all courses on the platform.
              </p>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  <span>Platform Active</span>
                </div>
                <div className="flex items-center">
                  <Globe className="w-4 h-4 mr-2" />
                  <span>All Systems Operational</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Last updated: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <Link href="/admin/courses/create">
                <Button className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Course
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 pb-12">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Total Courses</p>
                  <p className="text-3xl font-bold text-gray-900">{courses.length}</p>
                </div>
                <div className="w-12 h-12 bg-[#001e62]/10 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-[#001e62]" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Published</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {courses.filter(c => c.isPublished).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#001e62]/10 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-[#001e62]" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Drafts</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {courses.filter(c => !c.isPublished).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#001e62]/10 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-[#001e62]" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Total Students</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {courses.reduce((acc, course) => acc + course._count.enrollments, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#001e62]/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#001e62]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Unanswered Q&A</p>
                  <p className={`text-3xl font-bold ${stats.unansweredQuestions > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {stats.unansweredQuestions || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#001e62]/10 rounded-xl flex items-center justify-center">
                  <MessageSquare className={`w-6 h-6 ${stats.unansweredQuestions > 0 ? 'text-red-600' : 'text-[#001e62]'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="mb-6 flex items-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm flex-1">{error}</span>
            <button onClick={() => setError('')} className="ml-2 text-red-600 hover:text-red-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm flex-1">{success}</span>
            <button onClick={() => setSuccess('')} className="ml-2 text-green-600 hover:text-green-800">
              <X className="w-4 h-4" />
            </button>
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
              className="pl-10 bg-white"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'published' | 'draft')}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001e62]"
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
              <Card key={course.id} className="overflow-hidden shadow-sm border-gray-200 bg-white hover:shadow-xl transition-all duration-300">
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
                    <div className="aspect-video bg-gradient-to-br from-[#001e62]/10 to-blue-200 flex items-center justify-center">
                      <Play className="w-12 h-12 text-[#001e62]" />
                    </div>
                  )}
                  
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      course.isPublished 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {course.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  {course._count.enrollments > 50 && (
                    <div className="absolute top-3 left-3">
                      <span className="bg-[#001e62] text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Popular
                      </span>
                    </div>
                  )}

                  {course._count.unansweredQuestions && course._count.unansweredQuestions > 0 && (
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        {course._count.unansweredQuestions} Q&A
                      </span>
                    </div>
                  )}
                </div>

                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#001e62] font-medium">{course.category}</span>
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
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDuration(getTotalDuration(course))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {course._count.enrollments} students
                      </div>
                      <div className="text-xs text-gray-400">
                        Updated {formatDate(course.updatedAt)}
                      </div>
                    </div>

                    {course._count.questions && course._count.questions > 0 && (
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          {course._count.questions} questions
                        </div>
                        {course._count.unansweredQuestions && course._count.unansweredQuestions > 0 && (
                          <div className="text-xs text-red-600 font-medium">
                            {course._count.unansweredQuestions} unanswered
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Link href={`/admin/courses/${course.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full hover:bg-[#001e62]/5">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePublished(course.id, course.isPublished)}
                        className="flex-shrink-0 hover:bg-[#001e62]/5"
                        title={course.isPublished ? 'Unpublish course' : 'Publish course'}
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
                        onClick={() => setCourseToDelete(course)}
                        className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <Link href={`/admin/courses/${course.id}/manage`} className="block">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={`w-full ${
                          course._count.unansweredQuestions && course._count.unansweredQuestions > 0
                            ? 'border-red-200 text-red-700 hover:bg-red-50' 
                            : 'text-[#001e62] hover:bg-[#001e62]/5'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Manage Q&A & Announcements
                        {course._count.unansweredQuestions && course._count.unansweredQuestions > 0 && (
                          <span className="ml-2 bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full text-xs font-medium">
                            {course._count.unansweredQuestions}
                          </span>
                        )}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-sm border-gray-200 bg-white">
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
                    <Button className="bg-[#001e62] hover:bg-[#001e62]/90">Create First Course</Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link href="/admin/courses/create">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-gray-200">
                <CardContent className="p-4 text-center">
                  <Plus className="w-8 h-8 text-[#001e62] mx-auto mb-2" />
                  <p className="font-medium text-gray-900">Create New Course</p>
                  <p className="text-sm text-gray-600">Start building a new course</p>
                </CardContent>
              </Card>
            </Link>

            <button
              onClick={() => {
                setFilterStatus('draft')
                setSearchTerm('')
              }}
              className="text-left"
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-gray-200">
                <CardContent className="p-4 text-center">
                  <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="font-medium text-gray-900">Review Drafts</p>
                  <p className="text-sm text-gray-600">{courses.filter(c => !c.isPublished).length} courses waiting</p>
                </CardContent>
              </Card>
            </button>

            <button
              onClick={() => {
                setFilterStatus('published')
                setSearchTerm('')
              }}
              className="text-left"
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-gray-200">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-gray-900">View Published</p>
                  <p className="text-sm text-gray-600">{courses.filter(c => c.isPublished).length} live courses</p>
                </CardContent>
              </Card>
            </button>

            <Link href="/admin/qa">
              <Card className={`hover:shadow-md transition-shadow cursor-pointer border-gray-200 ${
                stats.unansweredQuestions > 0 ? 'ring-2 ring-red-200 bg-red-50' : ''
              }`}>
                <CardContent className="p-4 text-center">
                  <div className="relative">
                    <MessageSquare className={`w-8 h-8 mx-auto mb-2 ${
                      stats.unansweredQuestions > 0 ? 'text-red-600' : 'text-[#001e62]'
                    }`} />
                    {stats.unansweredQuestions > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-medium">
                        {stats.unansweredQuestions}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-gray-900">Manage Q&A</p>
                  <p className="text-sm text-gray-600">
                    {stats.unansweredQuestions > 0 
                      ? `${stats.unansweredQuestions} need answers`
                      : 'All questions answered'
                    }
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {filteredCourses.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Showing {filteredCourses.length} of {courses.length} courses
            </p>
          </div>
        )}

        {stats.unansweredQuestions > 0 && (
          <div className="mt-6">
            <Card className="border-red-200 bg-red-50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-900 mb-1">
                      Attention Required: Unanswered Questions
                    </h4>
                    <p className="text-sm text-red-700 mb-3">
                      You have {stats.unansweredQuestions} unanswered student questions that need your attention.
                      Responding promptly helps maintain student engagement and course quality.
                    </p>
                  </div>
                  <Link href="/admin/qa">
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white ml-4">
                      Review Questions
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {courseToDelete && (
        <DeleteConfirmationModal
          course={courseToDelete}
          onConfirm={handleDeleteCourse}
          onCancel={() => setCourseToDelete(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  )
}