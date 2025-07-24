// app/course/[courseId]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Clock, Users, Star, Play, Lock, CheckCircle, BookOpen } from 'lucide-react'
import { formatDuration, calculateProgress } from '@/lib/utils'

interface Video {
  id: string
  title: string
  description?: string
  duration?: number
  order: number
}

interface Course {
  id: string
  title: string
  description: string
  thumbnail?: string
  category: string
  level: string
  videos: Video[]
  _count: { enrollments: number }
}

interface VideoProgress {
  videoId: string
  completed: boolean
  testPassed: boolean
}

export default function CoursePage({ params }: { params: { courseId: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => {
    fetchCourse()
    if (session) {
      checkEnrollment()
      fetchProgress()
    }
  }, [params.courseId, session])

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${params.courseId}`)
      if (response.ok) {
        const data = await response.json()
        setCourse(data)
      }
    } catch (error) {
      console.error('Error fetching course:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkEnrollment = async () => {
    try {
      const response = await fetch(`/api/enrollments/${params.courseId}`)
      setIsEnrolled(response.ok)
    } catch (error) {
      console.error('Error checking enrollment:', error)
    }
  }

  const fetchProgress = async () => {
    try {
      const response = await fetch(`/api/progress/${params.courseId}`)
      if (response.ok) {
        const data = await response.json()
        setVideoProgress(data)
      }
    } catch (error) {
      console.error('Error fetching progress:', error)
    }
  }

  const handleEnroll = async () => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    setEnrolling(true)
    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: params.courseId })
      })

      if (response.ok) {
        setIsEnrolled(true)
        router.push(`/course/${params.courseId}/video/${course?.videos[0]?.id}`)
      }
    } catch (error) {
      console.error('Error enrolling:', error)
    } finally {
      setEnrolling(false)
    }
  }

  const getVideoStatus = (video: Video, index: number) => {
    const progress = videoProgress.find(p => p.videoId === video.id)
    
    if (progress?.completed && progress?.testPassed) {
      return 'completed'
    }
    
    if (index === 0) {
      return 'available'
    }
    
    const prevVideo = course?.videos[index - 1]
    const prevProgress = videoProgress.find(p => p.videoId === prevVideo?.id)
    
    if (prevProgress?.completed && prevProgress?.testPassed) {
      return 'available'
    }
    
    return 'locked'
  }

  const completedVideos = videoProgress.filter(p => p.completed && p.testPassed).length
  const totalVideos = course?.videos.length || 0
  const progressPercentage = calculateProgress(completedVideos, totalVideos)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark-900 mb-4">Course Not Found</h1>
          <Link href="/courses">
            <Button>Browse Courses</Button>
          </Link>
        </div>
      </div>
    )
  }

  const totalDuration = course.videos.reduce((acc, video) => acc + (video.duration || 0), 0)

  return (
    <div className="min-h-screen bg-white">
      {/* Course Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center mb-4">
                <span className="bg-primary-500 text-primary-100 px-3 py-1 rounded-full text-sm font-medium mr-4">
                  {course.category}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  course.level === 'BEGINNER' ? 'bg-green-500 text-white' :
                  course.level === 'INTERMEDIATE' ? 'bg-yellow-500 text-white' :
                  'bg-red-500 text-white'
                }`}>
                  {course.level}
                </span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
                {course.title}
              </h1>
              
              <p className="text-lg text-primary-100 mb-6">
                {course.description}
              </p>
              
              <div className="flex items-center space-x-6 text-primary-200 mb-8">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  {formatDuration(totalDuration)}
                </div>
                <div className="flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  {course.videos.length} videos
                </div>
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  {course._count.enrollments} students
                </div>
                <div className="flex items-center">
                  <Star className="w-5 h-5 mr-2 fill-yellow-400 text-yellow-400" />
                  4.8 rating
                </div>
              </div>

              {!isEnrolled ? (
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="min-w-40"
                >
                  {enrolling ? 'Enrolling...' : 'Enroll Now'}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Course Progress</span>
                      <span className="text-sm">{progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div
                        className="bg-white h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                  
                  <Link href={`/course/${course.id}/video/${course.videos[0].id}`}>
                    <Button size="lg" variant="secondary" className="min-w-40">
                      Continue Learning
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            <div className="lg:flex justify-end">
              {course.thumbnail ? (
                <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden shadow-xl">
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video w-full max-w-md bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Play className="w-16 h-16 text-white/60" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Course Videos */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Course Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {course.videos.map((video, index) => {
                    const status = getVideoStatus(video, index)
                    const progress = videoProgress.find(p => p.videoId === video.id)
                    
                    return (
                      <div
                        key={video.id}
                        className={`flex items-center p-4 rounded-lg border-2 transition-colors ${
                          status === 'completed' ? 'border-green-200 bg-green-50' :
                          status === 'available' ? 'border-primary-200 bg-primary-50 hover:border-primary-300' :
                          'border-dark-200 bg-dark-50'
                        }`}
                      >
                        <div className="flex items-center mr-4">
                          {status === 'completed' ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : status === 'available' ? (
                            <Play className="w-6 h-6 text-primary-600" />
                          ) : (
                            <Lock className="w-6 h-6 text-dark-400" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="font-semibold text-dark-900 mb-1">
                            {index + 1}. {video.title}
                          </h4>
                          {video.description && (
                            <p className="text-sm text-dark-600 mb-2">{video.description}</p>
                          )}
                          <div className="flex items-center text-sm text-dark-500">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatDuration(video.duration || 0)}
                          </div>
                        </div>
                        
                        {isEnrolled && status === 'available' && (
                          <Link href={`/course/${course.id}/video/${video.id}`}>
                            <Button size="sm">
                              {progress?.completed ? 'Review' : 'Watch'}
                            </Button>
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Course Stats */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-dark-600">Total Duration</span>
                  <span className="font-semibold">{formatDuration(totalDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-600">Videos</span>
                  <span className="font-semibold">{course.videos.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-600">Level</span>
                  <span className="font-semibold">{course.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-600">Students</span>
                  <span className="font-semibold">{course._count.enrollments}</span>
                </div>
                {isEnrolled && (
                  <div className="pt-4 border-t border-dark-200">
                    <div className="flex justify-between mb-2">
                      <span className="text-dark-600">Your Progress</span>
                      <span className="font-semibold">{progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-dark-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {!isEnrolled && (
              <Card className="border-primary-200">
                <CardContent className="text-center p-6">
                  <h3 className="font-semibold text-lg mb-2">Ready to Start?</h3>
                  <p className="text-dark-600 mb-4">
                    Join {course._count.enrollments} other students in this course.
                  </p>
                  <Button
                    className="w-full"
                    onClick={handleEnroll}
                    disabled={enrolling}
                  >
                    {enrolling ? 'Enrolling...' : 'Enroll Now'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}