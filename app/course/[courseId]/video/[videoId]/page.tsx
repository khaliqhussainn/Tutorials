// app/course/[courseId]/video/[videoId]/page.tsx - Complete Enhanced Version
'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  FileText, 
  BookOpen, 
  Target, 
  Award,
  Users,
  PlayCircle,
  Star,
  TrendingUp,
  Lock,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Settings,
  XCircle,
  Save,
  Eye,
  EyeOff
} from 'lucide-react'
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
  videos: { id: string; order: number; title: string }[]
}

// Enhanced Video Player Component
function EnhancedVideoPlayer({ 
  videoUrl, 
  title, 
  onProgress, 
  onEnded, 
  canWatch 
}: {
  videoUrl: string
  title: string
  onProgress: (progress: { played: number; playedSeconds: number }) => void
  onEnded: () => void
  canWatch: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      onProgress({
        played: video.currentTime / video.duration,
        playedSeconds: video.currentTime
      })
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    const handleEnded = () => {
      setPlaying(false)
      onEnded()
    }

    const handlePlay = () => setPlaying(true)
    const handlePause = () => setPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [onProgress, onEnded])

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout
    
    if (playing && showControls) {
      timeout = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }

    return () => clearTimeout(timeout)
  }, [playing, showControls])

  const togglePlay = () => {
    if (!videoRef.current) return
    
    if (playing) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch(console.error)
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !muted
    setMuted(!muted)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      if (newVolume === 0) {
        setMuted(true)
        videoRef.current.muted = true
      } else if (muted) {
        setMuted(false)
        videoRef.current.muted = false
      }
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    const time = (parseFloat(e.target.value) / 100) * duration
    videoRef.current.currentTime = time
    setCurrentTime(time)
  }

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds))
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      containerRef.current.requestFullscreen()
    }
  }

  const changePlaybackRate = (rate: number) => {
    if (!videoRef.current) return
    videoRef.current.playbackRate = rate
    setPlaybackRate(rate)
    setShowSettings(false)
  }

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!canWatch) {
    return (
      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-3">
            Complete Previous Videos
          </h3>
          <p className="text-gray-600 leading-relaxed">
            You need to complete previous videos and pass their tests before accessing this content.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="relative aspect-video bg-black rounded-lg overflow-hidden group cursor-pointer"
      onMouseEnter={() => setShowControls(true)}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => !playing && setShowControls(true)}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        preload="metadata"
        onError={(e) => {
          console.error('Video loading error:', e)
          console.error('Video URL:', videoUrl)
        }}
      />
      
      {/* Controls Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        
        {/* Center Play Button */}
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                togglePlay()
              }}
              className="w-20 h-20 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transform hover:scale-110 transition-all duration-200 shadow-lg"
            >
              <Play className="w-8 h-8 text-gray-900 ml-1" />
            </button>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
          {/* Progress Bar */}
          <div className="flex items-center space-x-3">
            <span className="text-white text-sm font-mono">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="100"
                value={duration ? (currentTime / duration) * 100 : 0}
                onChange={handleSeek}
                className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <span className="text-white text-sm font-mono">
              {formatTime(duration)}
            </span>
          </div>
          
          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  togglePlay()
                }}
                className="text-white hover:text-blue-400 transition-colors p-2"
              >
                {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  skipTime(-10)
                }}
                className="text-white hover:text-blue-400 transition-colors p-2"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  skipTime(10)
                }}
                className="text-white hover:text-blue-400 transition-colors p-2"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleMute()
                  }}
                  className="text-white hover:text-blue-400 transition-colors"
                >
                  {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  onClick={(e) => e.stopPropagation()}
                  className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowSettings(!showSettings)
                  }}
                  className="text-white hover:text-blue-400 transition-colors p-2"
                >
                  <Settings className="w-5 h-5" />
                </button>
                
                {showSettings && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg p-3 min-w-32">
                    <div className="text-white text-sm font-medium mb-2">Speed</div>
                    <div className="space-y-1">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                        <button
                          key={rate}
                          onClick={(e) => {
                            e.stopPropagation()
                            changePlaybackRate(rate)
                          }}
                          className={`block w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                            playbackRate === rate 
                              ? 'bg-blue-600 text-white' 
                              : 'text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFullscreen()
                }}
                className="text-white hover:text-blue-400 transition-colors p-2"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced Test Interface Component  
function TestInterface({ tests, onComplete }: {
  tests: Test[]
  onComplete: (passed: boolean, score: number) => void
}) {
  const [currentTestIndex, setCurrentTestIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>(new Array(tests.length).fill(-1))
  const [showResults, setShowResults] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(-1)

  const currentTest = tests[currentTestIndex]
  const isLastTest = currentTestIndex === tests.length - 1

  const handleAnswerSelect = (optionIndex: number) => {
    setSelectedAnswer(optionIndex)
  }

  const handleNext = () => {
    const newAnswers = [...answers]
    newAnswers[currentTestIndex] = selectedAnswer
    setAnswers(newAnswers)

    if (isLastTest) {
      const correctAnswers = newAnswers.filter((answer, index) => 
        answer === tests[index].correct
      ).length
      
      const score = (correctAnswers / tests.length) * 100
      const passed = score >= 70
      
      setShowResults(true)
      onComplete(passed, score)
    } else {
      setCurrentTestIndex(currentTestIndex + 1)
      setSelectedAnswer(-1)
    }
  }

  const calculateResults = () => {
    const correctAnswers = answers.filter((answer, index) => 
      answer === tests[index].correct
    ).length
    
    return {
      correct: correctAnswers,
      total: tests.length,
      score: (correctAnswers / tests.length) * 100,
      passed: (correctAnswers / tests.length) * 100 >= 70
    }
  }

  if (showResults) {
    const results = calculateResults()
    
    return (
      <Card className={`border-2 ${results.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <CardContent className="p-8 text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            results.passed ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {results.passed ? (
              <Award className="w-10 h-10 text-green-600" />
            ) : (
              <XCircle className="w-10 h-10 text-red-600" />
            )}
          </div>
          
          <h3 className={`text-2xl font-bold mb-4 ${
            results.passed ? 'text-green-800' : 'text-red-800'
          }`}>
            {results.passed ? 'Congratulations!' : 'Keep Learning!'}
          </h3>
          
          <p className={`text-lg mb-6 ${
            results.passed ? 'text-green-700' : 'text-red-700'
          }`}>
            You scored {results.score.toFixed(0)}% ({results.correct}/{results.total} correct)
          </p>
          
          {results.passed ? (
            <p className="text-green-600">
              You've successfully completed this lesson and can move on to the next video!
            </p>
          ) : (
            <p className="text-red-600">
              You need at least 70% to pass. Review the video and try again.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Question {currentTestIndex + 1} of {tests.length}</span>
          <Badge variant="secondary">Knowledge Check</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">{currentTest.question}</h3>
          
          <div className="space-y-3">
            {currentTest.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${
                  selectedAnswer === index
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    selectedAnswer === index
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedAnswer === index && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Select an answer to continue
          </div>
          
          <Button
            onClick={handleNext}
            disabled={selectedAnswer === -1}
          >
            {isLastTest ? 'Submit Test' : 'Next Question'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Main Video Page Component
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
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [videoStats, setVideoStats] = useState({
    totalWatches: 0,
    avgRating: 0
  })

  useEffect(() => {
    if (session) {
      fetchVideoData()
      checkAccess()
      fetchVideoStats()
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
        setNotes(data.notes || '')
      }
    } catch (error) {
      console.error('Error checking access:', error)
    }
  }

  const fetchVideoStats = async () => {
    try {
      const response = await fetch(`/api/videos/${params.videoId}/stats`)
      if (response.ok) {
        const data = await response.json()
        setVideoStats(data)
      }
    } catch (error) {
      console.error('Error fetching video stats:', error)
    }
  }

  const handleVideoProgress = async (progress: { played: number; playedSeconds: number }) => {
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
        
        if (video?.tests.length && !testPassed) {
          setTimeout(() => setShowTest(true), 1000)
        }
      } catch (error) {
        console.error('Error marking video complete:', error)
      }
    }
  }

  const handleTestComplete = async (passed: boolean, score: number) => {
    setTestPassed(passed)
    setShowTest(false)
    
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

      if (passed) {
        await fetch('/api/user/streak', { method: 'POST' })
      }
    } catch (error) {
      console.error('Error saving test result:', error)
    }
  }

  const getNextVideo = () => {
    if (!course || !video) return null
    
    if (video.sectionId && currentSection) {
      const currentVideoIndex = currentSection.videos.findIndex(v => v.id === video.id)
      
      if (currentVideoIndex < currentSection.videos.length - 1) {
        return currentSection.videos[currentVideoIndex + 1]
      } else {
        const currentSectionIndex = course.sections.findIndex(s => s.id === currentSection.id)
        if (currentSectionIndex < course.sections.length - 1) {
          const nextSection = course.sections[currentSectionIndex + 1]
          return nextSection.videos.length > 0 ? nextSection.videos[0] : null
        }
      }
    } else {
      const currentIndex = course.videos.findIndex(v => v.id === video.id)
      return currentIndex < course.videos.length - 1 ? course.videos[currentIndex + 1] : null
    }
    
    return null
  }

  const getPrevVideo = () => {
    if (!course || !video) return null
    
    if (video.sectionId && currentSection) {
      const currentVideoIndex = currentSection.videos.findIndex(v => v.id === video.id)
      
      if (currentVideoIndex > 0) {
        return currentSection.videos[currentVideoIndex - 1]
      } else {
        const currentSectionIndex = course.sections.findIndex(s => s.id === currentSection.id)
        if (currentSectionIndex > 0) {
          const prevSection = course.sections[currentSectionIndex - 1]
          return prevSection.videos.length > 0 ? prevSection.videos[prevSection.videos.length - 1] : null
        }
      }
    } else {
      const currentIndex = course.videos.findIndex(v => v.id === video.id)
      return currentIndex > 0 ? course.videos[currentIndex - 1] : null
    }
    
    return null
  }

  const getCurrentVideoPosition = () => {
    const allVideos = []
    if (course?.sections) {
      for (const section of course.sections) {
        allVideos.push(...section.videos)
      }
    }
    if (course?.videos) {
      allVideos.push(...course.videos)
    }
    
    const currentIndex = allVideos.findIndex(v => v.id === video?.id)
    return { current: currentIndex + 1, total: allVideos.length }
  }

  const saveNotes = async () => {
    try {
      await fetch(`/api/videos/${params.videoId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      })
    } catch (error) {
      console.error('Error saving notes:', error)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="max-w-md">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PlayCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-6">
              You need to sign in to access course videos and track your progress.
            </p>
            <Link href="/auth/signin">
              <Button size="lg">Sign In to Continue</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading video...</p>
        </div>
      </div>
    )
  }

  if (!video || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Video Not Found</h1>
          <p className="text-gray-600 mb-6">The video you're looking for doesn't exist.</p>
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            href={`/course/${params.courseId}`}
            className="flex items-center text-primary-600 hover:text-primary-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Back to Course</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            {currentSection && (
              <Badge variant="secondary" className="bg-primary-100 text-primary-800">
                {currentSection.title}
              </Badge>
            )}
            <span className="text-sm text-gray-500">
              Video {position.current} of {position.total}
            </span>
            {testPassed && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Video Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <EnhancedVideoPlayer
                videoUrl={video.videoUrl}
                title={video.title}
                onProgress={handleVideoProgress}
                onEnded={handleVideoEnd}
                canWatch={canWatch}
              />
              
              {/* Video Info */}
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{video.title}</h1>
                
                <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{video.duration ? formatDuration(video.duration) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    <span>{videoStats.totalWatches} views</span>
                  </div>
                  {videoStats.avgRating > 0 && (
                    <div className="flex items-center">
                      <Star className="w-4 h-4 mr-1 text-yellow-400" />
                      <span>{videoStats.avgRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {video.description && (
                  <div className="prose max-w-none">
                    <p className="text-gray-700 leading-relaxed">{video.description}</p>
                  </div>
                )}

                {/* Progress Bar */}
                {canWatch && video.duration && (
                  <div className="mt-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>{Math.round((watchTime / video.duration) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((watchTime / video.duration) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Test Section */}
            {showTest && video.tests.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Knowledge Check</h2>
                  <TestInterface tests={video.tests} onComplete={handleTestComplete} />
                </div>
              </div>
            )}

            {/* Test Results Display */}
            {videoCompleted && video.tests.length > 0 && !showTest && (
              <Card className={`border-2 ${testPassed ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {testPassed ? (
                        <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                      ) : (
                        <Target className="w-6 h-6 text-orange-600 mr-3" />
                      )}
                      <div>
                        <h3 className={`font-semibold ${testPassed ? 'text-green-800' : 'text-orange-800'}`}>
                          {testPassed ? 'Test Completed Successfully' : 'Test Available'}
                        </h3>
                        <p className={`text-sm ${testPassed ? 'text-green-600' : 'text-orange-600'}`}>
                          {testPassed 
                            ? 'You can now proceed to the next video'
                            : 'Complete the knowledge check to unlock the next video'
                          }
                        </p>
                      </div>
                    </div>
                    {!testPassed && (
                      <Button onClick={() => setShowTest(true)} variant="outline">
                        Take Test
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <div>
                {prevVideo && (
                  <Link href={`/course/${params.courseId}/video/${prevVideo.id}`}>
                    <Button variant="outline" className="flex items-center">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous Video
                    </Button>
                  </Link>
                )}
              </div>
              
              <div>
                {nextVideo && (testPassed || video.tests.length === 0) && (
                  <Link href={`/course/${params.courseId}/video/${nextVideo.id}`}>
                    <Button className="flex items-center">
                      Next Video
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Current Video</span>
                    <span className="font-medium">{position.current} of {position.total}</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${(position.current / position.total) * 100}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{Math.round((position.current / position.total) * 100)}% Complete</span>
                    <span>{position.total - position.current} remaining</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>My Notes</span>
                  <button
                    onClick={() => setShowNotes(!showNotes)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {showNotes ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </CardTitle>
              </CardHeader>
              {showNotes && (
                <CardContent>
                  <div className="space-y-4">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add your notes about this video..."
                      className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <Button
                      onClick={saveNotes}
                      size="sm"
                      className="w-full flex items-center justify-center"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Notes
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Video List */}
            {currentSection && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{currentSection.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {currentSection.videos.map((sectionVideo, index) => {
                      const isCurrentVideo = sectionVideo.id === video.id
                      const isCompleted = false // You would check this from your progress data
                      
                      return (
                        <Link
                          key={sectionVideo.id}
                          href={`/course/${params.courseId}/video/${sectionVideo.id}`}
                          className={`block p-3 rounded-lg transition-colors ${
                            isCurrentVideo
                              ? 'bg-primary-50 border-2 border-primary-200'
                              : 'hover:bg-gray-50 border-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 text-xs font-medium ${
                              isCompleted
                                ? 'bg-green-100 text-green-600'
                                : isCurrentVideo
                                ? 'bg-primary-100 text-primary-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {isCompleted ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                index + 1
                              )}
                            </div>
                            <span className={`text-sm ${
                              isCurrentVideo ? 'font-medium text-primary-900' : 'text-gray-700'
                            }`}>
                              {sectionVideo.title}
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Course Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Learning Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
                      <span className="text-sm text-gray-600">Watch Time</span>
                    </div>
                    <span className="font-medium">{formatDuration(watchTime)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Target className="w-5 h-5 text-blue-500 mr-2" />
                      <span className="text-sm text-gray-600">Tests Passed</span>
                    </div>
                    <span className="font-medium">{testPassed ? '1' : '0'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BookOpen className="w-5 h-5 text-purple-500 mr-2" />
                      <span className="text-sm text-gray-600">Course</span>
                    </div>
                    <span className="font-medium text-sm">{course.title}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}