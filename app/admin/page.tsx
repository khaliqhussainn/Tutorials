// app/admin/page.tsx - Enhanced Admin Dashboard
'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Users,
  BookOpen,
  Play,
  TrendingUp,
  Plus,
  Settings,
  BarChart3,
  UserCheck,
  Clock,
  Award,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Calendar,
  Activity,
  Globe,
  AlertCircle,
  CheckCircle2,
  Timer,
  Target
} from 'lucide-react'

interface AdminStats {
  totalUsers: number
  totalCourses: number
  totalVideos: number
  totalEnrollments: number
  publishedCourses: number
  totalWatchTimeHours: number
  courseCompletionRate: number
  userGrowth: number
  recentEnrollments: Array<{
    id: string
    enrolledAt: string
    progress: number
    user: {
      name: string
      email: string
      image: string | null
    }
    course: {
      title: string
      category: string
      thumbnail: string | null
    }
  }>
  topCourses: Array<{
    id: string
    title: string
    category: string
    thumbnail: string | null
    enrollmentCount: number
    videoCount: number
    level: string
    rating: number | null
  }>
  insights: {
    unpublishedCourses: number
    averageVideosPerCourse: number
    averageWatchTimePerUser: number
  }
}

export default function EnhancedAdminDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session?.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchAdminStats()
  }, [session, router])

  const fetchAdminStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        setError('Failed to fetch admin statistics')
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error)
      setError('Failed to fetch admin statistics')
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    return date.toLocaleDateString()
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

  if (error) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Dashboard</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <Button onClick={fetchAdminStats} className="bg-red-600 hover:bg-red-700">
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
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
                Admin Dashboard
              </h1>
              <p className="text-xl text-blue-100 mb-6">
                Welcome back! Here's what's happening with your platform.
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

            <div className="hidden lg:flex space-x-4">
              <Link href="/admin/courses/create">
                <Button className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30">
                  <Plus className="w-4 h-4 mr-2" />
                  New Course
                </Button>
              </Link>
              <Button className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 pb-12">
        {/* Main Stats Grid */}
        {stats && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Users */}
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Total Users</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
                      <div className="flex items-center mt-2">
                        <ArrowUpRight className="w-4 h-4 text-[#001e62] mr-1" />
                        <span className="text-sm text-[#001e62] font-medium">+{stats.userGrowth} this month</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-[#001e62]/10 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#001e62]" />
                    </div>
                  </div>
                  <Link href="/admin/users">
                    <Button variant="outline" size="sm" className="w-full mt-4 hover:bg-[#001e62]/5">
                      <Eye className="w-4 h-4 mr-2" />
                      View All Users
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Total Courses */}
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Total Courses</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalCourses.toLocaleString()}</p>
                      <div className="flex items-center mt-2">
                        <CheckCircle2 className="w-4 h-4 text-[#001e62] mr-1" />
                        <span className="text-sm text-gray-600">{stats.publishedCourses} published</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-[#001e62]/10 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-[#001e62]" />
                    </div>
                  </div>
                  <Link href="/admin/courses">
                    <Button variant="outline" size="sm" className="w-full mt-4 hover:bg-[#001e62]/5">
                      <Eye className="w-4 h-4 mr-2" />
                      Manage Courses
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Total Enrollments */}
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Total Enrollments</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalEnrollments.toLocaleString()}</p>
                      <div className="flex items-center mt-2">
                        <Target className="w-4 h-4 text-[#001e62] mr-1" />
                        <span className="text-sm text-gray-600">{stats.courseCompletionRate}% completion</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-[#001e62]/10 rounded-xl flex items-center justify-center">
                      <UserCheck className="w-6 h-6 text-[#001e62]" />
                    </div>
                  </div>
                  <Link href="/admin/enrollments">
                    <Button variant="outline" size="sm" className="w-full mt-4 hover:bg-[#001e62]/5">
                      <Eye className="w-4 h-4 mr-2" />
                      View Enrollments
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Total Watch Time */}
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Total Watch Time</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalWatchTimeHours.toLocaleString()}h</p>
                      <div className="flex items-center mt-2">
                        <Timer className="w-4 h-4 text-[#001e62] mr-1" />
                        <span className="text-sm text-gray-600">Avg {stats.insights.averageWatchTimePerUser}h/user</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-[#001e62]/10 rounded-xl flex items-center justify-center">
                      <Play className="w-6 h-6 text-[#001e62]" />
                    </div>
                  </div>
                  <Link href="/admin/analytics">
                    <Button variant="outline" size="sm" className="w-full mt-4 hover:bg-[#001e62]/5">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Analytics
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="border border-gray-200 bg-white">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalVideos}</div>
                  <div className="text-sm text-gray-600">Total Videos</div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 bg-white">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{stats.insights.averageVideosPerCourse}</div>
                  <div className="text-sm text-gray-600">Avg Videos/Course</div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 bg-white">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{stats.insights.unpublishedCourses}</div>
                  <div className="text-sm text-gray-600">Draft Courses</div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 bg-white">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-[#001e62] mb-1">{stats.courseCompletionRate}%</div>
                  <div className="text-sm text-gray-600">Complete Courses</div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Recent Enrollments */}
              <div className="lg:col-span-2">
                <Card className="shadow-sm border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl">Recent Enrollments</CardTitle>
                    <Link href="/admin/enrollments">
                      <Button variant="outline" size="sm">
                        View All
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {stats.recentEnrollments && stats.recentEnrollments.length > 0 ? (
                      <div className="space-y-4">
                        {stats.recentEnrollments.slice(0, 8).map((enrollment) => (
                          <div key={enrollment.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="w-10 h-10 bg-[#001e62] rounded-full flex items-center justify-center text-white font-semibold">
                              {enrollment.user.name?.charAt(0) || enrollment.user.email.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {enrollment.user.name || 'Anonymous User'}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {enrollment.user.email}
                              </p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {enrollment.course.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {enrollment.course.category}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">
                                {enrollment.progress}%
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatTimeAgo(enrollment.enrolledAt)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No recent enrollments</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top Courses & Quick Actions */}
              <div className="space-y-8">
                {/* Top Courses */}
                <Card className="shadow-sm border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Top Courses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.topCourses && stats.topCourses.length > 0 ? (
                      <div className="space-y-3">
                        {stats.topCourses.slice(0, 5).map((course) => (
                          <div key={course.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="w-8 h-8 bg-[#001e62] rounded-lg flex items-center justify-center">
                              <BookOpen className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {course.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {course.enrollmentCount} students
                              </p>
                            </div>
                            <div className="text-xs text-gray-400">
                              {course.level}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No courses yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="shadow-sm border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link href="/admin/courses/create">
                      <Button className="w-full justify-start bg-[#001e62] hover:bg-[#001e62]/90">
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Course
                      </Button>
                    </Link>

                    <Link href="/admin/users">
                      <Button variant="outline" className="w-full justify-start hover:bg-gray-50">
                        <Users className="w-4 h-4 mr-2" />
                        Manage Users
                      </Button>
                    </Link>

                    <Link href="/admin/analytics">
                      <Button variant="outline" className="w-full justify-start hover:bg-gray-50">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        View Analytics
                      </Button>
                    </Link>

                    <Link href="/admin/settings">
                      <Button variant="outline" className="w-full justify-start hover:bg-gray-50">
                        <Settings className="w-4 h-4 mr-2" />
                        Platform Settings
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
