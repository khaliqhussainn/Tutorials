// app/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import CourseCard from '@/components/course/CourseCard'
import { 
  BookOpen, 
  Clock, 
  Trophy, 
  Flame, 
  TrendingUp, 
  Play,
  Calendar,
  Target
} from 'lucide-react'

interface DashboardStats {
  enrolledCourses: number
  completedCourses: number
  totalWatchTime: number
  currentStreak: number
  favoriteCoursesCount: number
}

interface EnrolledCourse {
  id: string
  course: {
    id: string
    title: string
    description: string
    thumbnail?: string
    category: string
    level: string
    videos: { duration?: number }[]
    _count: { enrollments: number }
  }
  progress: number
  updatedAt: string
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentCourses, setRecentCourses] = useState<EnrolledCourse[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetchDashboardData()
    } else if (session === null) {
      router.push('/auth/signin')
    }
  }, [session, router])

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, coursesResponse, favoritesResponse] = await Promise.all([
        fetch('/api/user/stats'),
        fetch('/api/user/courses'),
        fetch('/api/user/favorites')
      ])

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json()
        setRecentCourses(coursesData)
      }

      if (favoritesResponse.ok) {
        const favoritesData = await favoritesResponse.json()
        setFavorites(favoritesData.map((fav: any) => fav.courseId))
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async (courseId: string) => {
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

  const formatWatchTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-dark-900 mb-2">
            Welcome back, {session.user.name?.split(' ')[0]}!
          </h1>
          <p className="text-lg text-dark-600">
            Continue your learning journey and achieve your goals.
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-dark-900">{stats.enrolledCourses}</p>
                <p className="text-sm text-dark-600">Enrolled</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-dark-900">{stats.completedCourses}</p>
                <p className="text-sm text-dark-600">Completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-dark-900">
                  {formatWatchTime(stats.totalWatchTime)}
                </p>
                <p className="text-sm text-dark-600">Watch Time</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Flame className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-dark-900">{stats.currentStreak}</p>
                <p className="text-sm text-dark-600">Day Streak</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-dark-900">{stats.favoriteCoursesCount}</p>
                <p className="text-sm text-dark-600">Favorites</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Continue Learning */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold text-dark-900">
              Continue Learning
            </h2>
            <Link href="/courses">
              <Button variant="outline">Browse All Courses</Button>
            </Link>
          </div>

          {recentCourses.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentCourses.slice(0, 6).map(enrollment => (
                <div key={enrollment.id} className="relative">
                  <CourseCard
                    course={enrollment.course}
                    isFavorite={favorites.includes(enrollment.course.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                  
                  {/* Progress Overlay */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-12 bg-dark-200 rounded-full h-1">
                        <div
                          className="bg-primary-600 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${enrollment.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-dark-700">
                        {Math.round(enrollment.progress)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Play className="w-16 h-16 text-dark-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-dark-700 mb-2">
                  Start Your Learning Journey
                </h3>
                <p className="text-dark-500 mb-6">
                  You haven't enrolled in any courses yet. Browse our catalog to get started.
                </p>
                <Link href="/courses">
                  <Button>Explore Courses</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}