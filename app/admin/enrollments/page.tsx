// app/admin/enrollments/page.tsx - Enrollments Management Page
'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Users,
  Search,
  Filter,
  Download,
  BookOpen,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Award,
  Target,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  UserCheck,
  Play
} from 'lucide-react'

interface Enrollment {
  id: string
  enrolledAt: string
  progress: number
  completedAt: string | null
  lastAccessedAt: string | null
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  course: {
    id: string
    title: string
    category: string
    level: string
    thumbnail: string | null
    _count: {
      videos: number
    }
  }
  _count: {
    completedVideos: number
  }
  totalWatchTime: number
}

interface EnrollmentStats {
  totalEnrollments: number
  activeEnrollments: number
  completedEnrollments: number
  averageProgress: number
  totalRevenue: number
  enrollmentsThisMonth: number
  completionRate: number
  averageCompletionTime: number
}

export default function AdminEnrollmentsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [filteredEnrollments, setFilteredEnrollments] = useState<Enrollment[]>([])
  const [stats, setStats] = useState<EnrollmentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'stalled'>('all')
  const [filterCourse, setFilterCourse] = useState('all')
  const [sortBy, setSortBy] = useState<'recent' | 'progress' | 'completion'>('recent')
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState('')
  const [courses, setCourses] = useState<Array<{id: string, title: string}>>([])
  const enrollmentsPerPage = 15

  useEffect(() => {
    if (session?.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchEnrollments()
    fetchEnrollmentStats()
    fetchCourses()
  }, [session, router])

  useEffect(() => {
    filterAndSortEnrollments()
  }, [enrollments, searchTerm, filterStatus, filterCourse, sortBy])

  const fetchEnrollments = async () => {
    try {
      setError('')
      const response = await fetch('/api/admin/enrollments')
      if (response.ok) {
        const data = await response.json()
        setEnrollments(data)
      } else {
        setError('Failed to fetch enrollments')
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error)
      setError('Failed to fetch enrollments')
    } finally {
      setLoading(false)
    }
  }

  const fetchEnrollmentStats = async () => {
    try {
      const response = await fetch('/api/admin/enrollments/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching enrollment stats:', error)
    }
  }

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/admin/courses')
      if (response.ok) {
        const data = await response.json()
        setCourses(data.map((course: any) => ({
          id: course.id,
          title: course.title
        })))
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const filterAndSortEnrollments = () => {
    let filtered = enrollments
    if (searchTerm) {
      filtered = filtered.filter(enrollment =>
        enrollment.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enrollment.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enrollment.course.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter(enrollment => {
        switch (filterStatus) {
          case 'completed':
            return enrollment.progress >= 100
          case 'active':
            return enrollment.progress > 0 && enrollment.progress < 100
          case 'stalled':
            const daysSinceLastAccess = enrollment.lastAccessedAt
              ? Math.floor((Date.now() - new Date(enrollment.lastAccessedAt).getTime()) / (1000 * 60 * 60 * 24))
              : 999
            return enrollment.progress > 0 && enrollment.progress < 100 && daysSinceLastAccess > 7
          default:
            return true
        }
      })
    }
    if (filterCourse !== 'all') {
      filtered = filtered.filter(enrollment => enrollment.course.id === filterCourse)
    }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'progress':
          return b.progress - a.progress
        case 'completion':
          if (a.completedAt && b.completedAt) {
            return new Date(b.completedAt).getTime() - new Date(a.completedAt!).getTime()
          }
          if (a.completedAt && !b.completedAt) return -1
          if (!a.completedAt && b.completedAt) return 1
          return 0
        case 'recent':
        default:
          return new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime()
      }
    })
    setFilteredEnrollments(filtered)
    setCurrentPage(1)
  }

  const exportEnrollments = async () => {
    try {
      const response = await fetch('/api/admin/enrollments/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `enrollments-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      setError('Failed to export enrollments')
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'text-green-600 bg-green-100'
    if (progress >= 70) return 'text-[#001e62] bg-[#001e62]/10'
    if (progress >= 30) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getStatusBadge = (enrollment: Enrollment) => {
    if (enrollment.progress >= 100) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Completed</span>
    }

    const daysSinceLastAccess = enrollment.lastAccessedAt
      ? Math.floor((Date.now() - new Date(enrollment.lastAccessedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999
    if (enrollment.progress > 0 && daysSinceLastAccess > 7) {
      return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">Stalled</span>
    }

    if (enrollment.progress > 0) {
      return <span className="px-2 py-1 bg-[#001e62]/10 text-[#001e62] rounded-full text-xs font-medium">In Progress</span>
    }

    return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Not Started</span>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  // Pagination
  const totalPages = Math.ceil(filteredEnrollments.length / enrollmentsPerPage)
  const startIndex = (currentPage - 1) * enrollmentsPerPage
  const endIndex = startIndex + enrollmentsPerPage
  const currentEnrollments = filteredEnrollments.slice(startIndex, endIndex)

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#001e62] mx-auto mb-4" />
          <p className="text-gray-600">Loading enrollments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Enrollment Management
              </h1>
              <p className="text-lg text-gray-600">
                Track student progress and manage course enrollments.
              </p>
            </div>

            <div className="flex space-x-3">
             
              <Button onClick={fetchEnrollments} variant="outline" className="flex items-center">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <UserCheck className="w-6 h-6 text-[#001e62] mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stats.totalEnrollments}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Play className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stats.activeEnrollments}</div>
                  <div className="text-sm text-gray-600">Active</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stats.completedEnrollments}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="w-6 h-6 text-[#001e62] mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stats.averageProgress}%</div>
                  <div className="text-sm text-gray-600">Avg Progress</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-[#001e62] mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stats.enrollmentsThisMonth}</div>
                  <div className="text-sm text-gray-600">This Month</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Award className="w-6 h-6 text-[#001e62] mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stats.completionRate}%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="w-6 h-6 text-[#001e62] mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stats.averageCompletionTime}</div>
                  <div className="text-sm text-gray-600">Avg Days</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <BarChart3 className="w-6 h-6 text-[#001e62] mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Revenue</div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search by student name, email, or course..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001e62]"
                >
                  <option value="all">All Status</option>
                  <option value="active">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="stalled">Stalled</option>
                </select>
              </div>

              {/* Course Filter */}
              <div>
                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001e62]"
                >
                  <option value="all">All Courses</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001e62]"
                >
                  <option value="recent">Most Recent</option>
                  <option value="progress">Highest Progress</option>
                  <option value="completion">Recently Completed</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enrollments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Enrollments ({filteredEnrollments.length})</span>
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredEnrollments.length)} of {filteredEnrollments.length}
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent>
            {currentEnrollments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Student</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Course</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Progress</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Enrolled</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Watch Time</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentEnrollments.map((enrollment) => (
                      <tr key={enrollment.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-[#001e62] rounded-full flex items-center justify-center text-white font-semibold">
                              {enrollment.user.name?.charAt(0) || enrollment.user.email.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {enrollment.user.name || 'No name'}
                              </div>
                              <div className="text-sm text-gray-500">{enrollment.user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-medium text-gray-900 max-w-xs truncate">
                              {enrollment.course.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {enrollment.course.category} • {enrollment.course.level}
                            </div>
                            <div className="text-xs text-gray-400">
                              {enrollment.course._count.videos} videos
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="w-full">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-medium ${getProgressColor(enrollment.progress).split(' ')[0]}`}>
                                {enrollment.progress}%
                              </span>
                              <span className="text-xs text-gray-500">
                                {enrollment._count.completedVideos}/{enrollment.course._count.videos}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  enrollment.progress >= 100 ? 'bg-green-500' :
                                  enrollment.progress >= 70 ? 'bg-[#001e62]' :
                                  enrollment.progress >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(enrollment.progress, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(enrollment)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm">
                            <div className="text-gray-900">{formatDate(enrollment.enrolledAt)}</div>
                            {enrollment.lastAccessedAt && (
                              <div className="text-gray-500 text-xs">
                                Last: {formatDate(enrollment.lastAccessedAt)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-600">
                            {formatDuration(enrollment.totalWatchTime)}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <Link href={`/admin/enrollments/${enrollment.id}`}>
                              <Button variant="outline" size="sm" className="text-xs">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            </Link>
                            <Link href={`/course/${enrollment.course.id}`}>
                              <Button variant="outline" size="sm" className="text-xs">
                                <BookOpen className="w-3 h-3 mr-1" />
                                Course
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No enrollments found</h3>
                <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredEnrollments.length)} of {filteredEnrollments.length} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>

                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let page;
                    if (totalPages <= 7) {
                      page = i + 1;
                    } else if (currentPage <= 4) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      page = totalPages - 6 + i;
                    } else {
                      page = currentPage - 3 + i;
                    }

                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "primary" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Insights */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Popular Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {enrollments
                  ? Object.values(enrollments.reduce((acc, enrollment) => {
                      const courseId = enrollment.course.id;
                      if (!acc[courseId]) {
                        acc[courseId] = {
                          course: enrollment.course,
                          count: 0,
                          avgProgress: 0,
                          totalProgress: 0
                        };
                      }
                      acc[courseId].count++;
                      acc[courseId].totalProgress += enrollment.progress;
                      acc[courseId].avgProgress = Math.round(acc[courseId].totalProgress / acc[courseId].count);
                      return acc;
                    }, {} as any))
                    .sort((a: any, b: any) => b.count - a.count)
                    .slice(0, 5)
                    .map((item: any) => (
                      <div key={item.course.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.course.title}</p>
                          <p className="text-xs text-gray-500">{item.count} enrollments</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{item.avgProgress}%</p>
                          <p className="text-xs text-gray-500">avg progress</p>
                        </div>
                      </div>
                    ))
                  : <p className="text-gray-500 text-sm">No enrollment data</p>
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Completions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {enrollments
                  .filter(enrollment => enrollment.completedAt)
                  .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
                  .slice(0, 5)
                  .map(enrollment => (
                    <div key={enrollment.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {enrollment.user.name || enrollment.user.email}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{enrollment.course.title}</p>
                      </div>
                      <p className="text-xs text-gray-400">
                        {formatDate(enrollment.completedAt!)}
                      </p>
                    </div>
                  ))}
                {enrollments.filter(e => e.completedAt).length === 0 && (
                  <p className="text-gray-500 text-sm">No recent completions</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Engagement Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active learners</span>
                  <span className="text-sm font-medium">
                    {enrollments.filter(e => e.progress > 0 && e.progress < 100).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Average completion</span>
                  <span className="text-sm font-medium">
                    {Math.round(enrollments.reduce((acc, e) => acc + e.progress, 0) / enrollments.length || 0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total watch time</span>
                  <span className="text-sm font-medium">
                    {formatDuration(enrollments.reduce((acc, e) => acc + e.totalWatchTime, 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Stalled enrollments</span>
                  <span className="text-sm font-medium text-orange-600">
                    {enrollments.filter(e => {
                      const daysSinceLastAccess = e.lastAccessedAt
                        ? Math.floor((Date.now() - new Date(e.lastAccessedAt).getTime()) / (1000 * 60 * 60 * 24))
                        : 999;
                      return e.progress > 0 && e.progress < 100 && daysSinceLastAccess > 7;
                    }).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
