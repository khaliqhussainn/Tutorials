// app/course/[courseId]/page.tsx - Updated with sections support
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  Clock, 
  Users, 
  Star, 
  Play, 
  Lock, 
  CheckCircle, 
  BookOpen,
  ChevronDown,
  ChevronRight,
  Award,
  Target
} from 'lucide-react'
import { formatDuration, calculateProgress } from '@/lib/utils'

interface Video {
  id: string
  title: string
  description?: string
  duration?: number
  order: number
}

interface CourseSection {
  id: string
  title: string
  description?: string
  order: number
  videos: Video[]
}

interface Course {
  id: string
  title: string
  description: string
  thumbnail?: string
  category: string
  level: string
  sections: CourseSection[]
  videos: Video[] // Legacy videos without sections
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => {
    fetchCourse()
    if (session) {
      checkEnrollment()
      fetchProgress()
    }
  }, [params.courseId, session])

  useEffect(() => {
    // Expand all sections by default
    if (course?.sections) {
      const sectionIds = new Set(course.sections.map(s => s.id))
      setExpandedSections(sectionIds)
    }
  }, [course])

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
        // Navigate to first video in first section or first video overall
        const firstVideo = course?.sections?.[0]?.videos?.[0] || course?.videos?.[0]
        if (firstVideo) {
          router.push(`/course/${params.courseId}/video/${firstVideo.id}`)
        }
      }
    } catch (error) {
      console.error('Error enrolling:', error)
    } finally {
      setEnrolling(false)
    }
  }

  const getVideoStatus = (video: Video, sectionVideos: Video[], videoIndex: number, sectionIndex: number) => {
    const progress = videoProgress.find(p => p.videoId === video.id)
    
    if (progress?.completed && progress?.testPassed) {
      return 'completed'
    }
    
    // First video of first section is always available
    if (sectionIndex === 0 && videoIndex === 0) {
      return 'available'
    }
    
    // Check if previous video is completed
    let prevVideo: Video | null = null
    
    if (videoIndex > 0) {
      // Previous video in same section
      prevVideo = sectionVideos[videoIndex - 1]
    } else if (sectionIndex > 0) {
      // Last video of previous section
      const prevSection = course?.sections?.[sectionIndex - 1]
      if (prevSection && prevSection.videos.length > 0) {
        prevVideo = prevSection.videos[prevSection.videos.length - 1]
      }
    }
    
    if (prevVideo) {
      const prevProgress = videoProgress.find(p => p.videoId === prevVideo!.id)
      if (prevProgress?.completed && prevProgress?.testPassed) {
        return 'available'
      }
    }
    
    return 'locked'
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const getTotalVideos = () => {
    const sectionVideos = course?.sections?.reduce((acc, section) => acc + section.videos.length, 0) || 0
    const legacyVideos = course?.videos?.length || 0
    return sectionVideos + legacyVideos
  }

  const getTotalDuration = () => {
    const sectionDuration = course?.sections?.reduce((acc, section) => 
      acc + section.videos.reduce((videoAcc, video) => videoAcc + (video.duration || 0), 0), 0
    ) || 0
    const legacyDuration = course?.videos?.reduce((acc, video) => acc + (video.duration || 0), 0) || 0
    return sectionDuration + legacyDuration
  }

  const getCompletedVideos = () => {
    return videoProgress.filter(p => p.completed && p.testPassed).length
  }

  const getProgressPercentage = () => {
    const total = getTotalVideos()
    const completed = getCompletedVideos()
    return calculateProgress(completed, total)
  }

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

  const totalVideos = getTotalVideos()
  const totalDuration = getTotalDuration()
  const progressPercentage = getProgressPercentage()

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
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-primary-200 mb-8">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  <div>
                    <div className="text-sm">Duration</div>
                    <div className="font-semibold">{formatDuration(totalDuration)}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  <div>
                    <div className="text-sm">Videos</div>
                    <div className="font-semibold">{totalVideos}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  <div>
                    <div className="text-sm">Students</div>
                    {/* <div className="font-semibold">{course._count.enrollments}</div> */}
                  </div>
                </div>
                <div className="flex items-center">
                  <Star className="w-5 h-5 mr-2 fill-yellow-400 text-yellow-400" />
                  <div>
                    <div className="text-sm">Rating</div>
                    <div className="font-semibold">4.8</div>
                  </div>
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
                  {enrolling ? 'Enrolling...' : 'Enroll Now - Free'}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Course Progress</span>
                      <div className="flex items-center space-x-2">
                        <Award className="w-4 h-4" />
                        <span className="text-sm">{progressPercentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3">
                      <div
                        className="bg-white h-3 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-2">
                      <span>{getCompletedVideos()} completed</span>
                      <span>{totalVideos - getCompletedVideos()} remaining</span>
                    </div>
                  </div>
                  
                  <Link href={`/course/${course.id}/video/${course.sections?.[0]?.videos?.[0]?.id || course.videos?.[0]?.id}`}>
                    <Button size="lg" variant="secondary" className="min-w-40">
                      <Play className="w-5 h-5 mr-2" />
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
          {/* Course Sections */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Course Content
                </CardTitle>
                <p className="text-sm text-dark-600">
                  {course.sections?.length || 0} sections • {totalVideos} videos • {formatDuration(totalDuration)} total length
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Course Sections */}
                  {course.sections?.map((section, sectionIndex) => (
                    <div key={section.id} className="border border-dark-200 rounded-lg overflow-hidden">
                      {/* Section Header */}
                      <div 
                        className="flex items-center justify-between p-4 bg-dark-50 cursor-pointer hover:bg-dark-100 transition-colors"
                        onClick={() => toggleSection(section.id)}
                      >
                        <div className="flex items-center">
                          <div className="flex items-center mr-3">
                            {expandedSections.has(section.id) ? (
                              <ChevronDown className="w-5 h-5 text-dark-600" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-dark-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-dark-900">
                              Section {sectionIndex + 1}: {section.title}
                            </h3>
                            {section.description && (
                              <p className="text-sm text-dark-600 mt-1">{section.description}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-dark-500">
                          <span>{section.videos.length} videos</span>
                          <span>
                            {formatDuration(
                              section.videos.reduce((acc, v) => acc + (v.duration || 0), 0)
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Section Videos */}
                      {expandedSections.has(section.id) && (
                        <div className="border-t border-dark-200">
                          {section.videos.map((video, videoIndex) => {
                            const status = getVideoStatus(video, section.videos, videoIndex, sectionIndex)
                            const progress = videoProgress.find(p => p.videoId === video.id)
                            
                            return (
                              <div
                                key={video.id}
                                className={`flex items-center p-4 border-b border-dark-100 last:border-b-0 transition-colors ${
                                  status === 'completed' ? 'bg-green-50' :
                                  status === 'available' ? 'hover:bg-primary-50' :
                                  'bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center mr-4">
                                  <div className="w-8 h-8 rounded-full bg-white border-2 border-dark-200 flex items-center justify-center mr-3 text-xs font-medium">
                                    {videoIndex + 1}
                                  </div>
                                  {status === 'completed' ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                  ) : status === 'available' ? (
                                    <Play className="w-5 h-5 text-primary-600" />
                                  ) : (
                                    <Lock className="w-5 h-5 text-dark-400" />
                                  )}
                                </div>
                                
                                <div className="flex-1">
                                  <h4 className="font-medium text-dark-900 mb-1">
                                    {video.title}
                                  </h4>
                                  {video.description && (
                                    <p className="text-sm text-dark-600 mb-2">{video.description}</p>
                                  )}
                                  <div className="flex items-center text-sm text-dark-500 space-x-4">
                                    <div className="flex items-center">
                                      <Clock className="w-4 h-4 mr-1" />
                                      {formatDuration(video.duration || 0)}
                                    </div>
                                    {status === 'completed' && (
                                      <div className="flex items-center text-green-600">
                                        <Target className="w-4 h-4 mr-1" />
                                        Test Passed
                                      </div>
                                    )}
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
                      )}
                    </div>
                  ))}

                  {/* Legacy Videos (without sections) */}
                  {course.videos && course.videos.length > 0 && (
                    <div className="border border-yellow-200 rounded-lg overflow-hidden">
                      <div className="p-4 bg-yellow-50">
                        <h3 className="font-semibold text-yellow-800">Additional Content</h3>
                        <p className="text-sm text-yellow-700">Extra videos and materials</p>
                      </div>
                      <div className="border-t border-yellow-200">
                        {course.videos.map((video, index) => (
                          <div
                            key={video.id}
                            className="flex items-center p-4 border-b border-yellow-100 last:border-b-0 hover:bg-yellow-50 transition-colors"
                          >
                            <Play className="w-5 h-5 text-yellow-600 mr-4" />
                            <div className="flex-1">
                              <h4 className="font-medium text-dark-900">{video.title}</h4>
                              {video.description && (
                                <p className="text-sm text-dark-600">{video.description}</p>
                              )}
                            </div>
                            <div className="text-sm text-dark-500">
                              {formatDuration(video.duration || 0)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Course Stats Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-dark-600">Total Duration</span>
                  <span className="font-semibold">{formatDuration(totalDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-600">Sections</span>
                  <span className="font-semibold">{course.sections?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-600">Videos</span>
                  <span className="font-semibold">{totalVideos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-600">Level</span>
                  <span className="font-semibold">{course.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-600">Students</span>
                  {/* <span className="font-semibold">{course._count.enrollments}</span> */}
                </div>
                {isEnrolled && (
                  <div className="pt-4 border-t border-dark-200">
                    <div className="flex justify-between mb-2">
                      <span className="text-dark-600">Your Progress</span>
                      <span className="font-semibold">{progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-dark-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-dark-500">
                      {getCompletedVideos()} of {totalVideos} videos completed
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {!isEnrolled && (
              <Card className="border-primary-200">
                <CardContent className="text-center p-6">
                  <Target className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Ready to Start Learning?</h3>
                  <p className="text-dark-600 mb-4">
                    Join {course._count.enrollments} other students and start your learning journey today.
                  </p>
                  <Button
                    className="w-full"
                    onClick={handleEnroll}
                    disabled={enrolling}
                  >
                    {enrolling ? 'Enrolling...' : 'Enroll Now - Free'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Learning Path */}
            {isEnrolled && (
              <Card>
                <CardHeader>
                  <CardTitle>Learning Path</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {course.sections?.slice(0, 3).map((section, index) => {
                      const sectionProgress = section.videos.filter(v => 
                        videoProgress.find(p => p.videoId === v.id && p.completed && p.testPassed)
                      ).length
                      const sectionTotal = section.videos.length
                      const sectionPercentage = sectionTotal > 0 ? (sectionProgress / sectionTotal) * 100 : 0
                      
                      return (
                        <div key={section.id} className="p-3 border border-dark-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-dark-900 text-sm">{section.title}</h4>
                            <span className="text-xs text-dark-500">{Math.round(sectionPercentage)}%</span>
                          </div>
                          <div className="w-full bg-dark-200 rounded-full h-1">
                            <div
                              className="bg-primary-600 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${sectionPercentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                    {course.sections && course.sections.length > 3 && (
                      <p className="text-xs text-dark-500 text-center">
                        +{course.sections.length - 3} more sections
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}