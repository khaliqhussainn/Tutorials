// app/course/[courseId]/video/[videoId]/page.tsx - FIXED with proper duration handling and improved UI
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
  BookOpen, 
  Target, 
  Award,
  Users,
  PlayCircle,
  Star,
  Lock,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Settings,
  Save,
  Eye,
  EyeOff,
  RotateCcw,
  FileText,
  AlertTriangle,
  Download,
  Share2,
  ChevronRight,
  Brain,
  Zap,
  HelpCircle,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp
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
  sections: CourseSection[]
  videos: { id: string; order: number; title: string; duration?: number }[]
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

// Enhanced Video Player Component with Better Controls
function ProfessionalVideoPlayer({ 
  videoUrl, 
  title, 
  onProgress, 
  onEnded, 
  canWatch,
  initialTime = 0
}: {
  videoUrl: string
  title: string
  onProgress: (progress: { played: number; playedSeconds: number }) => void
  onEnded: () => void
  canWatch: boolean
  initialTime?: number
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
  const [buffered, setBuffered] = useState(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      onProgress({
        played: video.currentTime / video.duration,
        playedSeconds: video.currentTime
      })
      
      // Update buffered
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1))
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      if (initialTime > 0) {
        video.currentTime = initialTime
        setCurrentTime(initialTime)
      }
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
  }, [onProgress, onEnded, initialTime])

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
      <div className="aspect-video bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-blue-900/20"></div>
        
        <div className="text-center max-w-md p-8 relative z-10">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6 border border-white/20">
            <Lock className="w-10 h-10 text-white/80" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">
            Complete Previous Lectures
          </h3>
          <p className="text-gray-300 leading-relaxed">
            You need to complete previous lectures and pass their quizzes to unlock this content.
          </p>
          <div className="mt-6 p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
            <p className="text-sm text-gray-400">
              💡 Tip: Sequential learning helps build a strong foundation
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="relative aspect-video bg-black rounded-lg overflow-hidden group cursor-pointer shadow-2xl"
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
        }}
      />
      
      {/* Controls Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 transition-opacity duration-300 ${
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
              className="w-20 h-20 bg-white/95 hover:bg-white rounded-full flex items-center justify-center transform hover:scale-110 transition-all duration-200 shadow-2xl border-4 border-white/20"
            >
              <Play className="w-8 h-8 text-gray-900 ml-1" />
            </button>
          </div>
        )}

        {/* Top overlay with title */}
        <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent">
          <h3 className="text-white font-semibold text-lg truncate">{title}</h3>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
          {/* Progress Bar */}
          <div className="flex items-center space-x-3">
            <span className="text-white text-sm font-mono">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 relative">
              {/* Buffered progress */}
              <div 
                className="absolute top-0 h-1 bg-white/30 rounded-full"
                style={{ width: duration ? `${(buffered / duration) * 100}%` : '0%' }}
              />
              {/* Seek bar */}
              <input
                type="range"
                min="0"
                max="100"
                value={duration ? (currentTime / duration) * 100 : 0}
                onChange={handleSeek}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.2) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.2) 100%)`
                }}
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
                className="text-white hover:text-purple-400 transition-colors p-2 rounded-full hover:bg-white/10"
              >
                {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  skipTime(-10)
                }}
                className="text-white hover:text-purple-400 transition-colors p-2 rounded-full hover:bg-white/10"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  skipTime(10)
                }}
                className="text-white hover:text-purple-400 transition-colors p-2 rounded-full hover:bg-white/10"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleMute()
                  }}
                  className="text-white hover:text-purple-400 transition-colors rounded-full hover:bg-white/10 p-1"
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
                  className="text-white hover:text-purple-400 transition-colors p-2 rounded-full hover:bg-white/10"
                >
                  <Settings className="w-5 h-5" />
                </button>
                
                {showSettings && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-sm rounded-lg p-3 min-w-32 border border-white/20">
                    <div className="text-white text-sm font-medium mb-2">Playback Speed</div>
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
                              ? 'bg-purple-600 text-white' 
                              : 'text-gray-300 hover:bg-white/10'
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
                className="text-white hover:text-purple-400 transition-colors p-2 rounded-full hover:bg-white/10"
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

// Quiz Modal Component - Udemy Style
function QuizModal({
  video,
  onClose,
  onComplete
}: {
  video: Video
  onClose: () => void
  onComplete: (score: number, passed: boolean) => void
}) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>(new Array(video.tests.length).fill(-1))
  const [selectedAnswer, setSelectedAnswer] = useState<number>(-1)
  const [showResults, setShowResults] = useState(false)
  const [timeSpent, setTimeSpent] = useState(0)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const currentQuestion = video.tests[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === video.tests.length - 1

  const handleAnswerSelect = (optionIndex: number) => {
    setSelectedAnswer(optionIndex)
  }

  const handleNext = () => {
    const newAnswers = [...answers]
    newAnswers[currentQuestionIndex] = selectedAnswer
    setAnswers(newAnswers)

    if (isLastQuestion) {
      const correctAnswers = newAnswers.filter((answer, index) => 
        answer === video.tests[index].correct
      ).length
      
      const score = Math.round((correctAnswers / video.tests.length) * 100)
      const passed = score >= 70
      
      setShowResults(true)
      onComplete(score, passed)
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(answers[currentQuestionIndex + 1])
    }
  }

  const handlePrevious = () => {
    const newAnswers = [...answers]
    newAnswers[currentQuestionIndex] = selectedAnswer
    setAnswers(newAnswers)

    setCurrentQuestionIndex(currentQuestionIndex - 1)
    setSelectedAnswer(answers[currentQuestionIndex - 1])
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const calculateResults = () => {
    const correctAnswers = answers.filter((answer, index) => 
      answer === video.tests[index].correct
    ).length
    
    return {
      correct: correctAnswers,
      total: video.tests.length,
      score: Math.round((correctAnswers / video.tests.length) * 100),
      passed: (correctAnswers / video.tests.length) * 100 >= 70
    }
  }

  if (showResults) {
    const results = calculateResults()
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-8 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              results.passed ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {results.passed ? (
                <Award className="w-10 h-10 text-green-600" />
              ) : (
                <AlertTriangle className="w-10 h-10 text-red-600" />
              )}
            </div>
            
            <h2 className={`text-3xl font-bold mb-4 ${
              results.passed ? 'text-green-800' : 'text-red-800'
            }`}>
              {results.passed ? 'Congratulations!' : 'Keep Learning!'}
            </h2>
            
            <div className="mb-6">
              <div className={`text-4xl font-bold mb-2 ${
                results.passed ? 'text-green-700' : 'text-red-700'
              }`}>
                {results.score}%
              </div>
              <p className={`text-lg ${
                results.passed ? 'text-green-600' : 'text-red-600'
              }`}>
                {results.correct} out of {results.total} questions correct
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formatTime(timeSpent)}
                </div>
                <div className="text-sm text-gray-600">Time Taken</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 mb-1">70%</div>
                <div className="text-sm text-gray-600">Passing Score</div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                onClick={onClose}
                className={results.passed ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}
              >
                {results.passed ? 'Continue Learning' : 'Try Again Later'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Quiz: {video.title}
            </h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {video.tests.length}
              </span>
              <span className="text-sm text-gray-500">{formatTime(timeSpent)}</span>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / video.tests.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            {currentQuestion.question}
          </h3>
          
          <div className="space-y-3 mb-8">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                  selectedAnswer === index
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                    selectedAnswer === index
                      ? 'border-purple-500 bg-purple-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedAnswer === index && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <span className="text-gray-900">{option}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>

            <Button
              onClick={handleNext}
              disabled={selectedAnswer === -1}
              className="min-w-32 bg-purple-600 hover:bg-purple-700"
            >
              {isLastQuestion ? 'Submit Quiz' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
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
  const [videoProgress, setVideoProgress] = useState<VideoProgress | null>(null)
  const [watchTime, setWatchTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currentSection, setCurrentSection] = useState<CourseSection | null>(null)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [showQuiz, setShowQuiz] = useState(false)
  const [videoCompleted, setVideoCompleted] = useState(false)
  const [canWatch, setCanWatch] = useState(false)
  const [showQuizPrompt, setShowQuizPrompt] = useState(false)

  useEffect(() => {
    if (session) {
      fetchVideoData()
      fetchVideoProgress()
      checkVideoAccess()
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

  const fetchVideoProgress = async () => {
    try {
      const response = await fetch(`/api/videos/${params.videoId}/progress`)
      if (response.ok) {
        const data = await response.json()
        setVideoProgress(data)
        setWatchTime(data.watchTime || 0)
        setNotes(data.notes || '')
        setVideoCompleted(data.completed || false)
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
    if (progress.playedSeconds > watchTime) {
      setWatchTime(progress.playedSeconds)
      
      // Update progress every 10 seconds
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
        
        // Show quiz prompt if available and not passed
        if (video?.tests.length && !videoProgress?.testPassed) {
          setShowQuizPrompt(true)
        }
      } catch (error) {
        console.error('Error marking video complete:', error)
      }
    }
  }

  const handleQuizComplete = async (score: number, passed: boolean) => {
    try {
      await fetch(`/api/progress/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: params.videoId,
          score,
          passed,
          answers: JSON.stringify([]), // You might want to pass actual answers
          timeSpent: 0
        })
      })
      
      await fetchVideoProgress()
      setShowQuiz(false)
      setShowQuizPrompt(false)
    } catch (error) {
      console.error('Error updating quiz progress:', error)
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

  const getPreviousVideo = () => {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md border-0 shadow-lg">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PlayCircle className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-6">
              You need to sign in to access course videos and track your progress.
            </p>
            <Link href="/auth/signin">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">Sign In to Continue</Button>
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
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
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
            <Button className="bg-purple-600 hover:bg-purple-700">Back to Course</Button>
          </Link>
        </div>
      </div>
    )
  }

  const nextVideo = getNextVideo()
  const previousVideo = getPreviousVideo()
  const watchProgress = video.duration ? Math.min((watchTime / video.duration) * 100, 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header - Professional Style */}
      <div className="bg-white shadow-sm border-b px-4 py-3 fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Link 
              href={`/course/${params.courseId}`}
              className="flex items-center text-gray-600 hover:text-purple-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="font-medium">Back to course</span>
            </Link>
            
            <div className="hidden md:block">
              <h1 className="font-semibold truncate max-w-md text-gray-900">{course.title}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Progress indicator */}
            <div className="hidden md:flex items-center space-x-2 text-sm">
              <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${watchProgress}%` }}
                />
              </div>
              <span className="text-gray-600">{Math.round(watchProgress)}%</span>
            </div>

            <Button variant="outline" size="sm" className="text-gray-700 border-gray-300">
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </div>

      <div className="pt-16 flex">
        {/* Main Video Content */}
        <div className="flex-1">
          <div className="bg-black">
            <div className="max-w-5xl mx-auto p-4">
              <ProfessionalVideoPlayer
                videoUrl={video.videoUrl}
                title={video.title}
                onProgress={handleVideoProgress}
                onEnded={handleVideoEnd}
                canWatch={canWatch}
                initialTime={watchTime}
              />
            </div>
          </div>

          {/* Video Info Section */}
          <div className="bg-white border-b">
            <div className="max-w-5xl mx-auto px-6 py-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">{video.title}</h2>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{video.duration ? formatDuration(video.duration) : 'Duration not available'}</span>
                    </div>
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      <span>{Math.round(watchProgress)}% watched</span>
                    </div>
                    {videoCompleted && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span>Completed</span>
                      </div>
                    )}
                  </div>

                  {video.description && (
                    <p className="text-gray-700 leading-relaxed">{video.description}</p>
                  )}
                </div>

                <div className="ml-6 flex items-center space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNotes(!showNotes)}
                    className="border-gray-300"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    {showNotes ? 'Hide Notes' : 'Notes'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {showNotes && (
            <div className="bg-white border-b">
              <div className="max-w-5xl mx-auto px-6 py-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    My Notes
                  </h3>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add your notes about this lecture..."
                    className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <Button
                    onClick={saveNotes}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Notes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Quiz Prompt Section - Shows after video completion */}
          {showQuizPrompt && video.tests.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-b">
              <div className="max-w-5xl mx-auto px-6 py-8">
                <Card className="border-2 border-purple-200 bg-white shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mr-4">
                          <Brain className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-purple-800 mb-1">
                            🎉 Great Job! Ready for a Quick Quiz?
                          </h3>
                          <p className="text-purple-600">
                            Test your knowledge with {video.tests.length} questions to unlock the next lecture
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowQuizPrompt(false)}
                          className="border-purple-300 text-purple-700 hover:bg-purple-50"
                        >
                          Maybe Later
                        </Button>
                        <Button
                          onClick={() => {
                            setShowQuiz(true)
                            setShowQuizPrompt(false)
                          }}
                          className="bg-purple-600 hover:bg-purple-700 shadow-lg"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Take Quiz Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Quiz Section - Always visible if quiz exists */}
          {video.tests.length > 0 && (
            <div className="bg-white border-b">
              <div className="max-w-5xl mx-auto px-6 py-6">
                <Card className={`border-2 ${
                  videoProgress?.testPassed ? 'border-green-200 bg-green-50' :
                  videoCompleted ? 'border-purple-200 bg-purple-50' :
                  'border-gray-200 bg-gray-50'
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                          videoProgress?.testPassed ? 'bg-green-100' : 
                          videoCompleted ? 'bg-purple-100' : 'bg-gray-100'
                        }`}>
                          {videoProgress?.testPassed ? (
                            <Award className="w-6 h-6 text-green-600" />
                          ) : videoCompleted ? (
                            <Brain className="w-6 h-6 text-purple-600" />
                          ) : (
                            <Lock className="w-6 h-6 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <h3 className={`font-bold text-lg ${
                            videoProgress?.testPassed ? 'text-green-800' : 
                            videoCompleted ? 'text-purple-800' : 'text-gray-700'
                          }`}>
                            {videoProgress?.testPassed ? 'Quiz Completed!' : 
                             videoCompleted ? 'Knowledge Check Available' : 'Quiz Locked'}
                          </h3>
                          <p className={`text-sm ${
                            videoProgress?.testPassed ? 'text-green-600' : 
                            videoCompleted ? 'text-purple-600' : 'text-gray-500'
                          }`}>
                            {videoProgress?.testPassed ? 
                              `Excellent! You scored ${videoProgress.testScore}% and can continue to the next lecture.` :
                              videoCompleted ?
                              `Test your understanding with ${video.tests.length} questions. You need 70% to pass.` :
                              'Complete the lecture to unlock the quiz'
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {videoProgress?.testPassed ? (
                          <Link href={`/course/${params.courseId}/video/${params.videoId}/quiz`}>
                            <Button
                              variant="outline"
                              className="flex items-center border-green-300 text-green-700 hover:bg-green-100"
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Retake Quiz
                            </Button>
                          </Link>
                        ) : videoCompleted ? (
                          <>
                            <Link href={`/course/${params.courseId}/video/${params.videoId}/quiz`}>
                              <Button
                                variant="outline"
                                className="flex items-center border-purple-300 text-purple-700 hover:bg-purple-50"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Quiz
                              </Button>
                            </Link>
                            <Button
                              onClick={() => setShowQuiz(true)}
                              className="flex items-center bg-purple-600 hover:bg-purple-700"
                            >
                              <Zap className="w-4 h-4 mr-2" />
                              Take Quiz
                            </Button>
                          </>
                        ) : (
                          <Button
                            disabled
                            className="flex items-center opacity-50 cursor-not-allowed"
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            Quiz Locked
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Navigation Section */}
          <div className="bg-white">
            <div className="max-w-5xl mx-auto px-6 py-6">
              <div className="flex justify-between items-center">
                {/* Previous Video */}
                <div className="flex-1">
                  {previousVideo ? (
                    <Link href={`/course/${params.courseId}/video/${previousVideo.id}`}>
                      <Button 
                        variant="outline" 
                        className="w-full max-w-xs h-auto p-4 text-left border-gray-300"
                      >
                        <div className="flex items-center">
                          <ArrowLeft className="w-4 h-4 mr-3 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs text-gray-500 mb-1">Previous</div>
                            <div className="font-medium truncate">{previousVideo.title}</div>
                          </div>
                        </div>
                      </Button>
                    </Link>
                  ) : (
                    <div />
                  )}
                </div>

                {/* Next Video */}
                <div className="flex-1 flex justify-end">
                  {nextVideo ? (
                    (videoProgress?.testPassed || video.tests.length === 0 || !videoCompleted) ? (
                      <Link href={`/course/${params.courseId}/video/${nextVideo.id}`}>
                        <Button className="w-full max-w-xs h-auto p-4 text-right bg-purple-600 hover:bg-purple-700">
                          <div className="flex items-center">
                            <div className="min-w-0 mr-3">
                              <div className="text-xs text-purple-100 mb-1">Next</div>
                              <div className="font-medium truncate">{nextVideo.title}</div>
                            </div>
                            <ArrowRight className="w-4 h-4 flex-shrink-0" />
                          </div>
                        </Button>
                      </Link>
                    ) : (
                      <div className="w-full max-w-xs">
                        <div className="p-4 bg-gray-100 rounded-lg border border-gray-200">
                          <div className="text-center">
                            <Lock className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 mb-2">
                              Pass the quiz to unlock
                            </p>
                            <p className="text-xs text-gray-500 truncate">{nextVideo.title}</p>
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div />
                  )}
                </div>
              </div>

              {/* Course completion message */}
              {!nextVideo && videoProgress?.testPassed && (
                <div className="mt-6 text-center">
                  <Card className="border-2 border-green-200 bg-green-50">
                    <CardContent className="p-6">
                      <Award className="w-12 h-12 text-green-600 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-green-800 mb-2">
                        🎉 Congratulations!
                      </h3>
                      <p className="text-green-600 mb-4">
                        You've completed this course section. Great job on your learning journey!
                      </p>
                      <Link href={`/course/${params.courseId}`}>
                        <Button className="bg-green-600 hover:bg-green-700">
                          <BookOpen className="w-4 h-4 mr-2" />
                          Back to Course Overview
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Course Content */}
        <div className="w-80 bg-white border-l border-gray-200 max-h-screen overflow-y-auto">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-2">Course Content</h3>
            <p className="text-sm text-gray-600">
              {course.sections?.reduce((acc, section) => acc + section.videos.length, 0) || 0} lectures
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {currentSection && (
              <div className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">{currentSection.title}</h4>
                <div className="space-y-2">
                  {currentSection.videos.map((sectionVideo, index) => {
                    const isCurrentVideo = sectionVideo.id === video.id
                    const isCompleted = false // You would check this from progress data
                    
                    return (
                      <Link
                        key={sectionVideo.id}
                        href={`/course/${params.courseId}/video/${sectionVideo.id}`}
                        className={`block p-3 rounded-lg transition-colors ${
                          isCurrentVideo
                            ? 'bg-purple-100 border border-purple-200'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 text-xs font-medium ${
                            isCompleted
                              ? 'bg-green-100 text-green-600'
                              : isCurrentVideo
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : isCurrentVideo ? (
                              <Play className="w-3 h-3" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${
                              isCurrentVideo ? 'font-medium text-purple-900' : 'text-gray-700'
                            }`}>
                              {sectionVideo.title}
                            </p>
                            {sectionVideo.duration && (
                              <p className="text-xs text-gray-500">
                                {formatDuration(sectionVideo.duration)}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quiz Modal */}
      {showQuiz && video && (
        <QuizModal
          video={video}
          onClose={() => setShowQuiz(false)}
          onComplete={handleQuizComplete}
        />
      )}
    </div>
  )
}