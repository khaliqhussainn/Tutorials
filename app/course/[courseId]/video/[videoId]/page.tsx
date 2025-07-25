// app/course/[courseId]/video/[videoId]/page.tsx - Updated with sections support
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import VideoPlayer from '@/components/course/VideoPlayer'
import TestInterface from '@/components/test/TestInterface'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, ArrowRight, CheckCircle, Clock, FileText, BookOpen, Target, Award } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

interface Video {
  id: string
  title: string
  description?: string
  videoUrl: string
  duration?: number
  order: number
  sectionId?: string
  tests: Test[]
}

interface Test {
  id: string
  question: string
  options: string[]
  correct: number
}

interface CourseSection {
  id: string
  title: string
  order: number
  videos: { id: string; order: number; title: string }[]
}

interface Course {
  id: string
  title: string
  sections: CourseSection[]
  videos: { id: string; order: number; title: string }[] // Legacy videos
}

export default function VideoPage({ 
  params 
}: { 
  params: { courseId: string; videoId: string } 
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const [video, setVideo] = useState<Video | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [showTest, setShowTest] = useState(false)
  const [testPassed, setTestPassed] = useState(false)
  const [videoCompleted, setVideoCompleted] = useState(false)
  const [watchTime, setWatchTime] = useState(0)
  const [canWatch, setCanWatch] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentSection, setCurrentSection] = useState<CourseSection | null>(null)

  useEffect(() => {
    if (session) {
      fetchVideoData()
      checkAccess()
    }
  }, [params.videoId, session])

  const fetchVideoData = async () => {
    try {
      const [videoResponse, courseResponse] = await Promise.all([
        fetch(`/api/videos/${params.videoId}`),
        fetch(`/api/courses/${params.courseId}`)
      ])

      if (videoResponse.ok && courseResponse.ok) {
        const videoData = await videoResponse.json()
        const courseData = await courseResponse.json()
        setVideo(videoData)
        setCourse(courseData)
        
        // Find current section if video belongs to one
        if (videoData.sectionId) {
          const section = courseData.sections?.find((s: CourseSection) => s.id === videoData.sectionId)
          setCurrentSection(section || null)
        }
      }
    } catch (error) {
      console.error('Error fetching video data:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkAccess = async () => {
    try {
      const response = await fetch(`/api/videos/${params.videoId}/access`)
      if (response.ok) {
        const data = await response.json()
        setCanWatch(data.canWatch)
        setVideoCompleted(data.completed)
        setTestPassed(data.testPassed)
        setWatchTime(data.watchTime || 0)
      }
    } catch (error) {
      console.error('Error checking access:', error)
    }
  }

  const handleVideoProgress = async (progress: { played: number; playedSeconds: number }) => {
    if (progress.playedSeconds > watchTime) {
      setWatchTime(progress.playedSeconds)
      
      // Update progress in database every 10 seconds
      if (Math.floor(progress.playedSeconds) % 10 === 0) {
        try {
          await fetch(`/api/progress/video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoId: params.videoId,
              watchTime: progress.playedSeconds
            })
          })
        } catch (error) {
          console.error('Error updating progress:', error)
        }
      }
    }
  }

  const handleVideoEnd = async () => {
    if (!videoCompleted) {
      setVideoCompleted(true)
      setShowTest(true)
      
      try {
        await fetch(`/api/progress/video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: params.videoId,
            completed: true,
            watchTime: video?.duration || 0
          })
        })
      } catch (error) {
        console.error('Error marking video complete:', error)
      }
    }
  }

  const handleTestComplete = async (passed: boolean, score: number) => {
    setTestPassed(passed)
    
    try {
      await fetch(`/api/progress/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: params.videoId,
          passed,
          score
        })
      })

      // Update daily streak if test passed
      if (passed) {
        await fetch('/api/user/streak', {
          method: 'POST'
        })
      }
    } catch (error) {
      console.error('Error saving test result:', error)
    }
  }

  const getNextVideo = () => {
    if (!course || !video) return null
    
    if (video.sectionId && currentSection) {
      // Video is in a section
      const currentVideoIndex = currentSection.videos.findIndex(v => v.id === video.id)
      
      if (currentVideoIndex < currentSection.videos.length - 1) {
        // Next video in same section
        return currentSection.videos[currentVideoIndex + 1]
      } else {
        // First video of next section
        const currentSectionIndex = course.sections.findIndex(s => s.id === currentSection.id)
        if (currentSectionIndex < course.sections.length - 1) {
          const nextSection = course.sections[currentSectionIndex + 1]
          return nextSection.videos.length > 0 ? nextSection.videos[0] : null
        }
      }
    } else {
      // Legacy video without section
      const currentIndex = course.videos.findIndex(v => v.id === video.id)
      return currentIndex < course.videos.length - 1 ? course.videos[currentIndex + 1] : null
    }
    
    return null
  }

  const getPrevVideo = () => {
    if (!course || !video) return null
    
    if (video.sectionId && currentSection) {
      // Video is in a section
      const currentVideoIndex = currentSection.videos.findIndex(v => v.id === video.id)
      
      if (currentVideoIndex > 0) {
        // Previous video in same section
        return currentSection.videos[currentVideoIndex - 1]
      } else {
        // Last video of previous section
        const currentSectionIndex = course.sections.findIndex(s => s.id === currentSection.id)
        if (currentSectionIndex > 0) {
          const prevSection = course.sections[currentSectionIndex - 1]
          return prevSection.videos.length > 0 ? prevSection.videos[prevSection.videos.length - 1] : null
        }
      }
    } else {
      // Legacy video without section
      const currentIndex = course.videos.findIndex(v => v.id === video.id)
      return currentIndex > 0 ? course.videos[currentIndex - 1] : null
    }
    
    return null
  }

  const getAllVideos = () => {
    if (!course) return []
    
    const sectionVideos = course.sections?.flatMap(section => 
      section.videos.map(video => ({ ...video, sectionTitle: section.title }))
    ) || []
    
    const legacyVideos = course.videos?.map(video => ({ ...video, sectionTitle: 'Additional Content' })) || []
    
    return [...sectionVideos, ...legacyVideos]
  }

  const getCurrentVideoPosition = () => {
    const allVideos = getAllVideos()
    const currentIndex = allVideos.findIndex(v => v.id === video?.id)
    return { current: currentIndex + 1, total: allVideos.length }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center p-8">
            <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-dark-600 mb-6">
              You need to sign in to access course videos.
            </p>
            <Link href="/auth/signin">
              <Button>Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!video || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark-900 mb-4">Video Not Found</h1>
          <Link href={`/course/${params.courseId}`}>
            <Button>Back to Course</Button>
          </Link>
        </div>
      </div>
    )
  }

  const nextVideo = getNextVideo()
  const prevVideo = getPrevVideo()
  const position = getCurrentVideoPosition()

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            href={`/course/${params.courseId}`}
            className="flex items-center text-primary-600 hover:text-primary-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Course
          </Link>
          
          <div className="text-sm text-dark-500 flex items-center space-x-4">
            {currentSection && (
              <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-xs font-medium">
                {currentSection.title}
              </span>
            )}
            <span>Video {position.current} of {position.total}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Video Player */}
            {!showTest && (
              <div className="space-y-4">
                <VideoPlayer
                  videoUrl={video.videoUrl}
                  title={video.title}
                  onProgress={handleVideoProgress}
                  onEnded={handleVideoEnd}
                  canWatch={canWatch}
                />
                
                {videoCompleted && !testPassed && video.tests.length > 0 && (
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-yellow-600" />
                      </div>
                      <h3 className="font-semibold text-yellow-800 mb-2 text-lg">
                        Complete the Knowledge Check
                      </h3>
                      <p className="text-yellow-700 mb-6">
                        Test your understanding of this video before proceeding to the next lesson.
                      </p>
                      <Button onClick={() => setShowTest(true)} size="lg">
                        <Target className="w-5 h-5 mr-2" />
                        Take Test
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Test Interface */}
            {showTest && video.tests.length > 0 && (
              <TestInterface
                tests={video.tests}
                onComplete={handleTestComplete}
              />
            )}

            {/* Video Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center text-xl">
                      {video.title}
                      {testPassed && (
                        <CheckCircle className="w-6 h-6 text-green-600 ml-3" />
                      )}
                    </CardTitle>
                    {currentSection && (
                      <p className="text-sm text-primary-600 font-medium mt-1">
                        {currentSection.title}
                      </p>
                    )}
                  </div>
                  {testPassed && (
                    <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      <Award className="w-4 h-4 mr-2" />
                      Completed
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {video.description && (
                  <p className="text-dark-600 mb-4 leading-relaxed">{video.description}</p>
                )}
                
                <div className="flex items-center text-sm text-dark-500 space-x-6">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Duration: {formatDuration(video.duration || 0)}
                  </div>
                  {video.tests.length > 0 && (
                    <div className="flex items-center">
                      <Target className="w-4 h-4 mr-2" />
                      {video.tests.length} test questions
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <div>
                {prevVideo && (
                  <Link href={`/course/${params.courseId}/video/${prevVideo.id}`}>
                    <Button variant="outline" className="flex items-center">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      <div className="text-left">
                        <div className="text-xs text-dark-500">Previous</div>
                        <div className="font-medium">{prevVideo.title}</div>
                      </div>
                    </Button>
                  </Link>
                )}
              </div>
              
              <div>
                {nextVideo && testPassed && (
                  <Link href={`/course/${params.courseId}/video/${nextVideo.id}`}>
                    <Button className="flex items-center">
                      <div className="text-right mr-2">
                        <div className="text-xs text-primary-100">Next</div>
                        <div className="font-medium">{nextVideo.title}</div>
                      </div>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Course Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Course Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Section-based videos */}
                  {course.sections?.map((section, sectionIndex) => (
                    <div key={section.id} className="space-y-2">
                      <h4 className="font-medium text-dark-800 text-sm">
                        {sectionIndex + 1}. {section.title}
                      </h4>
                      <div className="space-y-1 ml-4">
                        {section.videos.map((v, videoIndex) => (
                          <div
                            key={v.id}
                            className={`flex items-center p-2 rounded-lg text-sm transition-colors ${
                              v.id === video.id 
                                ? 'bg-primary-100 text-primary-800' 
                                : 'text-dark-600 hover:bg-dark-50'
                            }`}
                          >
                            <div className="w-5 h-5 rounded-full border border-dark-300 flex items-center justify-center mr-3 text-xs">
                              {videoIndex + 1}
                            </div>
                            <span className="flex-1 truncate">{v.title}</span>
                            {v.id === video.id && testPassed && (
                              <CheckCircle className="w-4 h-4 text-green-600 ml-2" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* Legacy videos */}
                  {course.videos && course.videos.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-dark-800 text-sm">Additional Content</h4>
                      <div className="space-y-1 ml-4">
                        {course.videos.map((v, index) => (
                          <div
                            key={v.id}
                            className={`flex items-center p-2 rounded-lg text-sm ${
                              v.id === video.id 
                                ? 'bg-primary-100 text-primary-800' 
                                : 'text-dark-600 hover:bg-dark-50'
                            }`}
                          >
                            <div className="w-5 h-5 rounded-full border border-dark-300 flex items-center justify-center mr-3 text-xs">
                              {index + 1}
                            </div>
                            <span className="flex-1 truncate">{v.title}</span>
                            {v.id === video.id && testPassed && (
                              <CheckCircle className="w-4 h-4 text-green-600 ml-2" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href={`/course/${params.courseId}`}>
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Course Overview
                  </Button>
                </Link>
                
                <Link href="/dashboard">
                  <Button variant="outline" className="w-full justify-start">
                    <Target className="w-4 h-4 mr-2" />
                    My Dashboard
                  </Button>
                </Link>
                
                {videoCompleted && !showTest && video.tests.length > 0 && (
                  <Button 
                    className="w-full justify-start"
                    onClick={() => setShowTest(true)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Take Test
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}