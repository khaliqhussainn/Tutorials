// app/course/[courseId]/video/[videoId]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import VideoPlayer from '@/components/course/VideoPlayer'
import TestInterface from '@/components/test/TestInterface'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, ArrowRight, CheckCircle, Clock, FileText } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

interface Video {
  id: string
  title: string
  description?: string
  videoUrl: string
  duration?: number
  order: number
  tests: Test[]
}

interface Test {
  id: string
  question: string
  options: string[]
  correct: number
}

interface Course {
  id: string
  title: string
  videos: { id: string; order: number; title: string }[]
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
    
    const currentIndex = course.videos.findIndex(v => v.id === video.id)
    return currentIndex < course.videos.length - 1 
      ? course.videos[currentIndex + 1] 
      : null
  }

  const getPrevVideo = () => {
    if (!course || !video) return null
    
    const currentIndex = course.videos.findIndex(v => v.id === video.id)
    return currentIndex > 0 
      ? course.videos[currentIndex - 1] 
      : null
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
          
          <div className="text-sm text-dark-500">
            Video {video.order} of {course.videos.length}
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
                    <CardContent className="p-4 text-center">
                      <FileText className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                      <h3 className="font-semibold text-yellow-800 mb-2">
                        Complete the Test
                      </h3>
                      <p className="text-yellow-700 mb-4">
                        You need to pass the test to proceed to the next video.
                      </p>
                      <Button onClick={() => setShowTest(true)}>
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

            {/* Video Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{video.title}</span>
                  {testPassed && (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {video.description && (
                  <p className="text-dark-600 mb-4">{video.description}</p>
                )}
                
                <div className="flex items-center text-sm text-dark-500">
                  <Clock className="w-4 h-4 mr-2" />
                  Duration: {formatDuration(video.duration || 0)}
                </div>
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <div>
                {prevVideo && (
                  <Link href={`/course/${params.courseId}/video/${prevVideo.id}`}>
                    <Button variant="outline">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous: {prevVideo.title}
                    </Button>
                  </Link>
                )}
              </div>
              
              <div>
                {nextVideo && testPassed && (
                  <Link href={`/course/${params.courseId}/video/${nextVideo.id}`}>
                    <Button>
                      Next: {nextVideo.title}
                      <ArrowRight className="w-4 h-4 ml-2" />
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
                <CardTitle className="text-lg">Course Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {course.videos.map((v, index) => (
                    <div
                      key={v.id}
                      className={`flex items-center p-2 rounded-lg text-sm ${
                        v.id === video.id 
                          ? 'bg-primary-100 text-primary-800' 
                          : 'text-dark-600 hover:bg-dark-50'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full border-2 border-dark-300 flex items-center justify-center mr-3 text-xs">
                        {index + 1}
                      </div>
                      <span className="flex-1 truncate">{v.title}</span>
                      {v.id === video.id && testPassed && (
                        <CheckCircle className="w-4 h-4 text-green-600 ml-2" />
                      )}
                    </div>
                  ))}
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
                  <Button variant="outline" className="w-full">
                    Course Overview
                  </Button>
                </Link>
                
                <Link href="/dashboard">
                  <Button variant="outline" className="w-full">
                    My Dashboard
                  </Button>
                </Link>
                
                {videoCompleted && !showTest && video.tests.length > 0 && (
                  <Button 
                    className="w-full"
                    onClick={() => setShowTest(true)}
                  >
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