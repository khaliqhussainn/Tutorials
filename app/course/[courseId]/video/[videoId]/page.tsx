// app/course/[courseId]/video/[videoId]/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { VideoPlayerWithTranscript, VideoPlayerRef } from '@/components/VideoPlayerWithTranscript'
import { NotesTab } from '@/components/NotesTab'
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  Target, 
  Award,
  PlayCircle,
  Star,
  Lock,
  FileText,
  Share2,
  Brain,
  Zap,
  HelpCircle,
  Info,
  StickyNote,
  ChevronDown,
  ChevronRight,
  Download,
  Eye
} from 'lucide-react'

interface TranscriptSegment {
  start: number
  end: number
  text: string
  confidence?: number
}

interface Video {
  id: string
  title: string
  description?: string
  videoUrl: string
  duration?: number
  order: number
  sectionId?: string
  tests: Test[]
  transcript?: {
    id: string
    content: string
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
    language: string
    segments?: TranscriptSegment[]
    confidence?: number
    provider?: string
  }
}

interface Test {
  id: string
  question: string
  options: string[]
  correct: number
  explanation?: string
}

interface CourseSection {
  id: string
  title: string
  order: number
  videos: { id: string; order: number; title: string; duration?: number }[]
}

interface Course {
  id: string
  title: string
  description: string
  thumbnail?: string
  category: string
  level: string
  sections: CourseSection[]
  videos: { id: string; order: number; title: string; duration?: number }[]
  _count: { enrollments: number }
  rating?: number
}

interface VideoProgress {
  videoId: string
  completed: boolean
  testPassed: boolean
  watchTime: number
  testScore?: number
  testAttempts?: number
  hasAccess: boolean
}

const formatDuration = (seconds: number) => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function VideoPage({ 
  params 
}: { 
  params: { courseId: string; videoId: string } 
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const playerRef = useRef<VideoPlayerRef>(null)
  
  const [video, setVideo] = useState<Video | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([])
  const [watchTime, setWatchTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currentSection, setCurrentSection] = useState<CourseSection | null>(null)
  const [videoCompleted, setVideoCompleted] = useState(false)
  const [canWatch, setCanWatch] = useState(false)
  // Updated activeTab type - removed 'transcript'
  const [activeTab, setActiveTab] = useState<'tutorials' | 'quiz' | 'notes' | 'about' | 'certificates'>('tutorials')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [currentVideoTime, setCurrentVideoTime] = useState(0)

  useEffect(() => {
    if (session) {
      fetchVideoData()
      fetchVideoProgress()
      checkVideoAccess()
    }
  }, [params.videoId, session])

  useEffect(() => {
    if (course?.sections) {
      const sectionIds = new Set(course.sections.map(s => s.id))
      setExpandedSections(sectionIds)
    }
  }, [course])

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

  const fetchVideoProgress = async () => {
    try {
      const response = await fetch(`/api/progress/${params.courseId}`)
      if (response.ok) {
        const data = await response.json()
        setVideoProgress(data)
        
        const currentVideoProgress = data.find((p: VideoProgress) => p.videoId === params.videoId)
        if (currentVideoProgress) {
          setWatchTime(currentVideoProgress.watchTime || 0)
          setVideoCompleted(currentVideoProgress.completed || false)
        }
      }
    } catch (error) {
      console.error('Error checking progress:', error)
    }
  }

  const checkVideoAccess = async () => {
    try {
      const response = await fetch(`/api/videos/${params.videoId}/access`)
      if (response.ok) {
        const data = await response.json()
        setCanWatch(data.canWatch)
      }
    } catch (error) {
      console.error('Error checking access:', error)
    }
  }

  const handleVideoProgress = async (progress: { played: number; playedSeconds: number }) => {
    setCurrentVideoTime(progress.playedSeconds)
    
    if (progress.playedSeconds > watchTime) {
      setWatchTime(progress.playedSeconds)
      
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
        
        await fetchVideoProgress()
      } catch (error) {
        console.error('Error marking video complete:', error)
      }
    }
  }

  const handleSeekTo = (timeInSeconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(timeInSeconds, 'seconds')
      setCurrentVideoTime(timeInSeconds)
    }
  }

  const getVideoStatus = (videoItem: any, sectionVideos: any[], videoIndex: number, sectionIndex: number): string => {
    const progress = videoProgress.find(p => p.videoId === videoItem.id)

    if (!videoItem.tests || videoItem.tests.length === 0) {
      if (progress?.completed) return 'completed'
    } else {
      if (progress?.completed && progress?.testPassed) return 'completed'
    }

    if (sectionIndex === 0 && videoIndex === 0) {
      return 'available'
    }

    let prevVideo: any = null

    if (videoIndex > 0) {
      prevVideo = sectionVideos[videoIndex - 1]
    } else if (sectionIndex > 0) {
      const prevSection = course?.sections?.[sectionIndex - 1]
      if (prevSection && prevSection.videos.length > 0) {
        prevVideo = prevSection.videos[prevSection.videos.length - 1]
      }
    }

    if (prevVideo) {
      const prevProgress = videoProgress.find(p => p.videoId === prevVideo.id)
      const prevCompleted = prevProgress?.completed &&
        ((!prevVideo.tests || prevVideo.tests.length === 0) || prevProgress?.testPassed)

      if (prevCompleted) {
        return 'available'
      }
    }

    return 'locked'
  }

  const getQuizStatus = (videoItem: any): string => {
    if (!videoItem.tests || videoItem.tests.length === 0) return 'no-quiz'

    const progress = videoProgress.find(p => p.videoId === videoItem.id)

    if (!progress?.completed) return 'quiz-locked'
    if (progress?.testPassed) return 'quiz-passed'
    return 'quiz-available'
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

  const getTotalVideos = (): number => {
    const sectionVideos = course?.sections?.reduce((acc, section) => acc + section.videos.length, 0) || 0
    const legacyVideos = course?.videos?.length || 0
    return sectionVideos + legacyVideos
  }

  const getCompletedVideos = (): number => {
    return videoProgress.filter(p => {
      const videoItem = getAllVideos().find(v => v.id === p.videoId)
      if (!videoItem) return false

      if (!videoItem.tests || videoItem.tests.length === 0) {
        return p.completed
      }
      return p.completed && p.testPassed
    }).length
  }

  const getAllVideos = (): any[] => {
    const allVideos: any[] = []
    if (course?.sections) {
      for (const section of course.sections) {
        allVideos.push(...section.videos)
      }
    }
    if (course?.videos) {
      allVideos.push(...course.videos)
    }
    return allVideos
  }

  const getProgressPercentage = (): number => {
    const total = getTotalVideos()
    const completed = getCompletedVideos()
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  // Render tutorials tab
  const renderTutorialsTab = () => (
    <div className="space-y-6">
      {course?.sections?.map((section, sectionIndex) => (
        <Card key={section.id} className="overflow-hidden border border-gray-200 shadow-sm">
          <div
            className="flex items-center justify-between p-6 bg-gray-50/80 cursor-pointer hover:bg-gray-100/80 transition-colors border-b border-gray-100"
            onClick={() => toggleSection(section.id)}
          >
            <div className="flex items-center">
              <div className="flex items-center mr-4">
                {expandedSections.has(section.id) ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  {section.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span className="flex items-center bg-white/80 px-3 py-1.5 rounded-full border border-gray-200">
                <PlayCircle className="w-4 h-4 mr-2" />
                {section.videos.length} videos
              </span>
              <span className="flex items-center bg-white/80 px-3 py-1.5 rounded-full border border-gray-200">
                <Clock className="w-4 h-4 mr-2" />
                {formatDuration(
                  section.videos.reduce((acc, v) => acc + (v.duration || 0), 0)
                )}
              </span>
            </div>
          </div>

          {expandedSections.has(section.id) && (
            <div className="p-0 bg-white">
              {section.videos.map((videoItem, videoIndex) => {
                const status = getVideoStatus(videoItem, section.videos, videoIndex, sectionIndex)
                const quizStatus = getQuizStatus(videoItem)
                const progress = videoProgress.find(p => p.videoId === videoItem.id)
                const isCurrentVideo = videoItem.id === params.videoId

                return (
                  <div
                    key={videoItem.id}
                    className={`flex items-center p-6 border-b border-gray-50 last:border-b-0 transition-all duration-200 ${
                      isCurrentVideo ? 'bg-blue-50/80 border-l-4 border-l-blue-600' :
                      status === 'completed' ? 'bg-green-50/60 hover:bg-green-50/80' :
                      status === 'available' ? 'hover:bg-gray-50/80' :
                      'bg-gray-25'
                    }`}
                  >
                    <div className="flex items-center mr-6">
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center mr-4 text-sm font-medium transition-all ${
                        isCurrentVideo ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 
                        status === 'completed' ? 'bg-green-600 text-white border-green-600 shadow-sm' :
                        'bg-white border-gray-300'
                      }`}>
                        {videoIndex + 1}
                      </div>
                      {status === 'completed' ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : status === 'available' ? (
                        <PlayCircle className={`w-6 h-6 ${isCurrentVideo ? 'text-blue-600' : 'text-gray-600'}`} />
                      ) : (
                        <Lock className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <h4 className={`font-medium mb-2 text-lg leading-snug ${
                        isCurrentVideo ? 'text-blue-900 font-semibold' : 'text-gray-900'
                      }`}>
                        {videoItem.title}
                      </h4>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <div className="flex items-center bg-gray-100/80 px-2.5 py-1 rounded-full">
                          <Clock className="w-3.5 h-3.5 mr-1.5" />
                          {formatDuration(videoItem.duration || 0)}
                        </div>

                        {quizStatus !== 'no-quiz' && (
                          <div className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            quizStatus === 'quiz-passed' ? 'bg-green-100 text-green-700' :
                            quizStatus === 'quiz-available' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {quizStatus === 'quiz-passed' ? (
                              <>
                                <Target className="w-3.5 h-3.5 mr-1.5" />
                                Quiz Passed ({progress?.testScore}%)
                              </>
                            ) : quizStatus === 'quiz-available' ? (
                              <>
                                <FileText className="w-3.5 h-3.5 mr-1.5" />
                                Quiz Available
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 mr-1.5" />
                                Quiz Locked
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {status === 'available' && !isCurrentVideo && (
                      <Link href={`/course/${course?.id}/video/${videoItem.id}`}>
                        <Button size="sm" className="ml-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                          {progress?.completed ? (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              Review
                            </>
                          ) : (
                            <>
                              <PlayCircle className="w-4 h-4 mr-2" />
                              Watch
                            </>
                          )}
                        </Button>
                      </Link>
                    )}

                    {isCurrentVideo && (
                      <Badge className="ml-4 bg-blue-600 text-white px-3 py-1.5 font-medium shadow-sm">
                        Now Playing
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      ))}
    </div>
  )

  // Render quiz tab
  const renderQuizTab = () => (
    <div className="space-y-6">
      {video!.tests.length > 0 ? (
        <Card className={`border-2 shadow-sm ${
          videoProgress.find(p => p.videoId === params.videoId)?.testPassed ? 'border-green-200 bg-green-50/30' :
          videoCompleted ? 'border-blue-200 bg-blue-50/30' :
          'border-gray-200 bg-gray-50/30'
        }`}>
          <CardContent className="p-8">
            <div className="text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ${
                videoProgress.find(p => p.videoId === params.videoId)?.testPassed ? 'bg-green-100 ring-4 ring-green-50' : 
                videoCompleted ? 'bg-blue-100 ring-4 ring-blue-50' : 'bg-gray-100'
              }`}>
                {videoProgress.find(p => p.videoId === params.videoId)?.testPassed ? (
                  <Award className="w-10 h-10 text-green-600" />
                ) : videoCompleted ? (
                  <Brain className="w-10 h-10 text-blue-600" />
                ) : (
                  <Lock className="w-10 h-10 text-gray-500" />
                )}
              </div>
              
              <h3 className={`text-2xl font-bold mb-4 ${
                videoProgress.find(p => p.videoId === params.videoId)?.testPassed ? 'text-green-800' : 
                videoCompleted ? 'text-blue-800' : 'text-gray-700'
              }`}>
                {videoProgress.find(p => p.videoId === params.videoId)?.testPassed ? 'Quiz Completed!' : 
                 videoCompleted ? 'Knowledge Check Available' : 'Quiz Locked'}
              </h3>
              
              <p className={`text-lg mb-6 ${
                videoProgress.find(p => p.videoId === params.videoId)?.testPassed ? 'text-green-700' : 
                videoCompleted ? 'text-blue-700' : 'text-gray-500'
              }`}>
                {videoProgress.find(p => p.videoId === params.videoId)?.testPassed ? 
                  `Excellent! You scored ${videoProgress.find(p => p.videoId === params.videoId)?.testScore}% and can continue to the next lecture.` :
                  videoCompleted ?
                  `Test your understanding with ${video!.tests.length} questions. You need 70% to pass.` :
                  'Complete the lecture to unlock the quiz'
                }
              </p>

              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="text-2xl font-bold text-blue-600 mb-1">{video!.tests.length}</div>
                  <div className="text-sm text-gray-600">Questions</div>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="text-2xl font-bold text-blue-600 mb-1">70%</div>
                  <div className="text-sm text-gray-600">Passing Score</div>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {videoProgress.find(p => p.videoId === params.videoId)?.testAttempts || 0}
                  </div>
                  <div className="text-sm text-gray-600">Attempts</div>
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                {videoProgress.find(p => p.videoId === params.videoId)?.testPassed ? (
                  <>
                    <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
                      <Eye className="w-4 h-4 mr-2" />
                      View Results
                    </Button>
                    <Link href={`/course/${params.courseId}/video/${params.videoId}/quiz`}>
                      <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
                        <Target className="w-4 h-4 mr-2" />
                        Retake Quiz
                      </Button>
                    </Link>
                  </>
                ) : videoCompleted ? (
                  <Link href={`/course/${params.courseId}/video/${params.videoId}/quiz`}>
                    <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                      <Zap className="w-4 h-4 mr-2" />
                      Take Quiz
                    </Button>
                  </Link>
                ) : (
                  <Button disabled className="opacity-50 cursor-not-allowed">
                    <Lock className="w-4 h-4 mr-2" />
                    Quiz Locked
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center">
            <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Quiz Available</h3>
            <p className="text-gray-600">
              This lecture doesn't have a quiz. Continue to the next lesson to continue your learning journey.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )

  // Render notes tab
  const renderNotesTab = () => (
    <NotesTab
      videoId={params.videoId}
      currentTime={currentVideoTime}
      videoDuration={video?.duration || 0}
      onSeekTo={handleSeekTo}
    />
  )

  // Render about tab
  const renderAboutTab = () => (
    <div className="space-y-8">
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="bg-gray-50/50">
          <CardTitle className="flex items-center text-gray-900">
            <Info className="w-5 h-5 mr-2 text-blue-600" />
            About This Course
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-3 text-gray-900">Course Overview</h3>
              <p className="text-gray-700 leading-relaxed">{course?.description}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50/50 rounded-xl">
                <h4 className="font-medium text-gray-900 mb-3">Course Details</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">Category:</span>
                    <Badge variant="outline" className="font-medium">{course?.category}</Badge>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">Level:</span>
                    <Badge variant="outline" className="font-medium">{course?.level}</Badge>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Total Videos:</span>
                    <span className="font-medium">{getTotalVideos()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Students Enrolled:</span>
                    <span className="font-medium">{course?._count?.enrollments || 0}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Rating:</span>
                    <span className="font-medium flex items-center">
                      {course?.rating || 4.8} <Star className="w-3 h-3 text-yellow-400 ml-1 fill-current" />
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-xl">
                <h4 className="font-medium text-gray-900 mb-3">Your Progress</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Completed:</span>
                    <span className="font-medium">{getCompletedVideos()}/{getTotalVideos()} videos</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300 shadow-sm"
                      style={{ width: `${getProgressPercentage()}%` }}
                    />
                  </div>
                  <div className="text-center text-sm font-medium text-blue-700">
                    {getProgressPercentage()}% Complete
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Render certificates tab
  const renderCertificatesTab = () => (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader className="bg-gray-50/50">
        <CardTitle className="flex items-center text-gray-900">
          <Award className="w-5 h-5 mr-2 text-amber-600" />
          Course Certificate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Award className="w-10 h-10 text-amber-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Course Completion Certificate</h3>
          <p className="text-gray-600 mb-6">
            Complete all course videos and pass the quizzes to earn your certificate
          </p>
          {getProgressPercentage() === 100 ? (
            <Button className="bg-amber-600 hover:bg-amber-700 shadow-sm">
              <Download className="w-4 h-4 mr-2" />
              Download Certificate
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="w-full bg-gray-200 rounded-full h-3 max-w-md mx-auto">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">
                {getProgressPercentage()}% complete - {getTotalVideos() - getCompletedVideos()} videos remaining
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md border-0 shadow-xl">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PlayCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-6">
              You need to sign in to access course videos and track your progress.
            </p>
            <Link href="/auth/signin">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">Sign In to Continue</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading video...</p>
        </div>
      </div>
    )
  }

  if (!video || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Video Not Found</h1>
          <p className="text-gray-600 mb-6">The video you're looking for doesn't exist.</p>
          <Link href={`/course/${params.courseId}`}>
            <Button className="bg-blue-600 hover:bg-blue-700">Back to Course</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center space-x-4">
            <Link 
              href={`/course/${params.courseId}`}
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-medium">Back to course</span>
            </Link>
            
            <div className="hidden md:block">
              <h1 className="font-semibold truncate max-w-md text-gray-900">{course.title}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" className="text-gray-700 border-gray-300 hover:bg-gray-50">
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Video Player Section */}
      <div className="bg-black">
        <div className="max-w-7xl mx-auto p-4">
          <VideoPlayerWithTranscript
            ref={playerRef}
            videoUrl={video.videoUrl}
            title={video.title}
            videoId={video.id}
            onProgress={handleVideoProgress}
            onEnded={handleVideoEnd}
            canWatch={canWatch}
            initialTime={watchTime}
          />
        </div>
      </div>

      {/* Video Info Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{video.title}</h2>
              
              <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                <div className="flex items-center bg-gray-100/80 px-3 py-1.5 rounded-full">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{video.duration ? formatDuration(video.duration) : 'Duration not available'}</span>
                </div>
                <div className="flex items-center bg-gray-100/80 px-3 py-1.5 rounded-full">
                  <Eye className="w-4 h-4 mr-2" />
                  <span>{Math.round(video.duration ? Math.min((watchTime / video.duration) * 100, 100) : 0)}% watched</span>
                </div>
                {videoCompleted && (
                  <div className="flex items-center text-green-600 bg-green-100/80 px-3 py-1.5 rounded-full">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span className="font-medium">Completed</span>
                  </div>
                )}
                {video.transcript && video.transcript.status === 'COMPLETED' && (
                  <div className="flex items-center text-blue-600 bg-blue-100/80 px-3 py-1.5 rounded-full">
                    <FileText className="w-4 h-4 mr-2" />
                    <span className="font-medium">Transcript Available</span>
                  </div>
                )}
              </div>

              {video.description && (
                <p className="text-gray-700 leading-relaxed">{video.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tab Navigation - Updated without transcript tab */}
        <div className="border-b border-gray-200 mb-8 bg-white rounded-t-lg shadow-sm">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'tutorials', label: 'Tutorials', icon: PlayCircle },
              { id: 'quiz', label: 'Quiz', icon: Target },
              { id: 'notes', label: 'Notes', icon: StickyNote },
              { id: 'about', label: 'About', icon: Info },
              { id: 'certificates', label: 'Certificate', icon: Award }
              // Removed transcript tab - it's integrated in the video player
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-all ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content - Removed transcript tab content */}
        <div className="min-h-96">
          {activeTab === 'tutorials' && renderTutorialsTab()}
          {activeTab === 'quiz' && renderQuizTab()}
          {activeTab === 'notes' && renderNotesTab()}
          {activeTab === 'about' && renderAboutTab()}
          {activeTab === 'certificates' && renderCertificatesTab()}
          {/* Removed transcript tab content */}
        </div>
      </div>
    </div>
  )

}