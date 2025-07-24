// app/admin/page.tsx
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
  BarChart3
} from 'lucide-react'

interface AdminStats {
  totalUsers: number
  totalCourses: number
  totalVideos: number
  totalEnrollments: number
  recentEnrollments: Array<{
    id: string
    user: { name: string; email: string }
    course: { title: string }
    createdAt: string
  }>
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

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
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error)
    } finally {
      setLoading(false)
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
              Admin Dashboard
            </h1>
            <p className="text-lg text-dark-600">
              Manage courses, users, and monitor platform performance.
            </p>
          </div>
          
          <div className="flex space-x-4">
            <Link href="/admin/courses/create">
              <Button className="flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                New Course
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                <p className="text-3xl font-bold text-dark-900 mb-1">{stats.totalUsers}</p>
                <p className="text-sm text-dark-600">Total Users</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <BookOpen className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <p className="text-3xl font-bold text-dark-900 mb-1">{stats.totalCourses}</p>
                <p className="text-sm text-dark-600">Total Courses</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Play className="w-10 h-10 text-purple-500 mx-auto mb-3" />
                <p className="text-3xl font-bold text-dark-900 mb-1">{stats.totalVideos}</p>
                <p className="text-sm text-dark-600">Total Videos</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-10 h-10 text-orange-500 mx-auto mb-3" />
                <p className="text-3xl font-bold text-dark-900 mb-1">{stats.totalEnrollments}</p>
                <p className="text-sm text-dark-600">Total Enrollments</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/courses">
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Manage Courses
                </Button>
              </Link>
              
              <Link href="/admin/courses/create">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Course
                </Button>
              </Link>
              
              <Link href="/admin/users">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
              </Link>
              
              <Link href="/admin/analytics">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Enrollments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Enrollments</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.recentEnrollments && stats.recentEnrollments.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentEnrollments.slice(0, 5).map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center space-x-3 p-3 bg-dark-50 rounded-lg">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark-900 truncate">
                          {enrollment.user.name}
                        </p>
                        <p className="text-xs text-dark-500 truncate">
                          enrolled in {enrollment.course.title}
                        </p>
                      </div>
                      <p className="text-xs text-dark-400">
                        {new Date(enrollment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  
                  <Link href="/admin/enrollments">
                    <Button variant="outline" size="sm" className="w-full">
                      View All Enrollments
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-dark-500 text-center py-8">No recent enrollments</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
