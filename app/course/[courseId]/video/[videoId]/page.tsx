// app/course/[courseId]/video/[videoId]/page.tsx - Restructured Layout
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
  FileText,
  Download,
  Share2,
  Brain,
  Zap,
  HelpCircle,
  Info,
  StickyNote,
  ChevronDown,
  ChevronRight
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

// Enhanced Video Player Component
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
        <div className="absolute inset-0 bg-gradient-to-r from-[#001e62]/20 to-[#001e62]/40"></div>
        
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
      
      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        
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

        <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent">
          <h3 className="text-white font-semibold text-lg truncate">{title}</h3>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
          <div className="flex items-center space-x-3">
            <span className="text-white text-sm font-mono">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 relative">
              <div 
                className="absolute top-0 h-1 bg-white/30 rounded-full"
                style={{ width: duration ? `${(buffered / duration) * 100}%` : '0%' }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={duration ? (currentTime / duration) * 100 : 0}
                onChange={handleSeek}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: `linear-gradient(to right, #001e62 0%, #001e62 ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.2) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.2) 100%)`
                }}
              />
            </div>
            <span className="text-white text-sm font-mono">
              {formatTime(duration)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  togglePlay()
                }}
                className="text-white hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-white/10"
              >
                {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  skipTime(-10)
                }}
                className="text-white hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-white/10"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  skipTime(10)
                }}
                className="text-white hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-white/10"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleMute()
                  }}
                  className="text-white hover:text-blue-400 transition-colors rounded-full hover:bg-white/10 p-1"
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
                  className="text-white hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-white/10"
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
                              ? 'bg-[#001e62] text-white' 
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
                className="text-white hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-white/10"
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

export default function VideoPage({ 
  params 
}: { 
  params: { courseId: string; videoId: string } 
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const [video, setVideo] = useState<Video | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([])
  const [watchTime, setWatchTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currentSection, setCurrentSection] = useState<CourseSection | null>(null)
  const [notes, setNotes] = useState('')
  const [videoCompleted, setVideoCompleted] = useState(false)
  const [canWatch, setCanWatch] = useState(false)
  const [activeTab, setActiveTab] = useState<'tutorials' | 'quiz' | 'notes' | 'about' | 'certificates'>('tutorials')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

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
        
        // Get current video progress
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

  const renderTutorialsTab = () => (
    <div className="space-y-6">
      {course?.sections?.map((section, sectionIndex) => (
        <Card key={section.id} className="overflow-hidden">
          <div
            className="flex items-center justify-between p-6 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors border-b"
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
              <span className="flex items-center">
                <PlayCircle className="w-4 h-4 mr-1" />
                {section.videos.length} videos
              </span>
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {formatDuration(
                  section.videos.reduce((acc, v) => acc + (v.duration || 0), 0)
                )}
              </span>
            </div>
          </div>

          {expandedSections.has(section.id) && (
            <div className="p-0">
              {section.videos.map((videoItem, videoIndex) => {
                const status = getVideoStatus(videoItem, section.videos, videoIndex, sectionIndex)
                const quizStatus = getQuizStatus(videoItem)
                const progress = videoProgress.find(p => p.videoId === videoItem.id)
                const isCurrentVideo = videoItem.id === params.videoId

                return (
                  <div
                    key={videoItem.id}
                    className={`flex items-center p-6 border-b border-gray-100 last:border-b-0 transition-colors ${
                      isCurrentVideo ? 'bg-[#001e62]/10 border-l-4 border-l-[#001e62]' :
                      status === 'completed' ? 'bg-green-50' :
                      status === 'available' ? 'hover:bg-blue-50' :
                      'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center mr-6">
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center mr-4 text-sm font-medium ${
                        isCurrentVideo ? 'bg-[#001e62] text-white border-[#001e62]' : 'bg-white border-gray-200'
                      }`}>
                        {videoIndex + 1}
                      </div>
                      {status === 'completed' ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : status === 'available' ? (
                        <Play className={`w-6 h-6 ${isCurrentVideo ? 'text-[#001e62]' : 'text-blue-600'}`} />
                      ) : (
                        <Lock className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <h4 className={`font-medium mb-2 text-lg ${
                        isCurrentVideo ? 'text-[#001e62] font-semibold' : 'text-gray-900'
                      }`}>
                        {videoItem.title}
                      </h4>
                      <div className="flex items-center text-sm text-gray-500 space-x-6">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatDuration(videoItem.duration || 0)}
                        </div>

                        {quizStatus !== 'no-quiz' && (
                          <div className={`flex items-center ${
                            quizStatus === 'quiz-passed' ? 'text-green-600' :
                            quizStatus === 'quiz-available' ? 'text-blue-600' :
                            'text-gray-500'
                          }`}>
                            {quizStatus === 'quiz-passed' ? (
                              <>
                                <Target className="w-4 h-4 mr-1" />
                                Quiz Passed ({progress?.testScore}%)
                              </>
                            ) : quizStatus === 'quiz-available' ? (
                              <>
                                <FileText className="w-4 h-4 mr-1" />
                                Quiz Available
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4 mr-1" />
                                Quiz Locked
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {status === 'available' && !isCurrentVideo && (
                      <Link href={`/course/${course?.id}/video/${videoItem.id}`}>
                        <Button size="lg" className="ml-4 bg-[#001e62] hover:bg-[#001e62]/90">
                          {progress?.completed ? 'Review' : 'Watch'}
                        </Button>
                      </Link>
                    )}

                    {isCurrentVideo && (
                      <Badge className="ml-4 bg-[#001e62] text-white">
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

  const renderQuizTab = () => (
    <div className="space-y-6">
      {video!.tests.length > 0 ? (
        <Card className={`border-2 ${
          videoProgress.find(p => p.videoId === params.videoId)?.testPassed ? 'border-green-200 bg-green-50' :
          videoCompleted ? 'border-[#001e62]/20 bg-[#001e62]/5' :
          'border-gray-200 bg-gray-50'
        }`}>
          <CardContent className="p-8">
            <div className="text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                videoProgress.find(p => p.videoId === params.videoId)?.testPassed ? 'bg-green-100' : 
                videoCompleted ? 'bg-[#001e62]/10' : 'bg-gray-100'
              }`}>
                {videoProgress.find(p => p.videoId === params.videoId)?.testPassed ? (
                  <Award className="w-10 h-10 text-green-600" />
                ) : videoCompleted ? (
                  <Brain className="w-10 h-10 text-[#001e62]" />
                ) : (
                  <Lock className="w-10 h-10 text-gray-500" />
                )}
              </div>
              
              <h3 className={`text-2xl font-bold mb-4 ${
                videoProgress.find(p => p.videoId === params.videoId)?.testPassed ? 'text-green-800' : 
                videoCompleted ? 'text-[#001e62]' : 'text-gray-700'
              }`}>
                {videoProgress.find(p => p.videoId === params.videoId)?.testPassed ? 'Quiz Completed!' : 
                 videoCompleted ? 'Knowledge Check Available' : 'Quiz Locked'}
              </h3>
              
              <p className={`text-lg mb-6 ${
                videoProgress.find(p => p.videoId === params.videoId)?.testPassed ? 'text-green-600' : 
                videoCompleted ? 'text-[#001e62]' : 'text-gray-500'
              }`}>
                {videoProgress.find(p => p.videoId === params.videoId)?.testPassed ? 
                  `Excellent! You scored ${videoProgress.find(p => p.videoId === params.videoId)?.testScore}% and can continue to the next lecture.` :
                  videoCompleted ?
                  `Test your understanding with ${video!.tests.length} questions. You need 70% to pass.` :
                  'Complete the lecture to unlock the quiz'
                }
              </p>

              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-[#001e62] mb-1">{video!.tests.length}</div>
                  <div className="text-sm text-gray-600">Questions</div>
                </div>
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-[#001e62] mb-1">70%</div>
                  <div className="text-sm text-gray-600">Passing Score</div>
                </div>
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-[#001e62] mb-1">
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
                    <Button className="bg-[#001e62] hover:bg-[#001e62]/90">
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
        <Card>
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

  const renderNotesTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <StickyNote className="w-5 h-5 mr-2" />
          My Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add your notes about this lecture..."
            className="w-full h-48 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#001e62] focus:border-transparent"
          />
          <Button
            onClick={saveNotes}
            className="bg-[#001e62] hover:bg-[#001e62]/90"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Notes
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderAboutTab = () => (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="w-5 h-5 mr-2" />
            About This Course
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">Course Overview</h3>
              <p className="text-gray-700 leading-relaxed">{course?.description}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Course Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium">{course?.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Level:</span>
                    <span className="font-medium">{course?.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Videos:</span>
                    <span className="font-medium">{getTotalVideos()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Students Enrolled:</span>
                    <span className="font-medium">{course?._count?.enrollments || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rating:</span>
                    <span className="font-medium flex items-center">
                      {course?.rating || 4.8} <Star className="w-3 h-3 text-yellow-400 ml-1 fill-current" />
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Your Progress</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Completed:</span>
                    <span className="font-medium">{getCompletedVideos()}/{getTotalVideos()} videos</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#001e62] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage()}%` }}
                    />
                  </div>
                  <div className="text-center text-sm text-gray-600">
                    {getProgressPercentage()}% Complete
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What you'll learn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span>Master the fundamentals of {course?.category}</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span>Build real-world projects from scratch</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span>Understand industry best practices</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span>Apply modern development techniques</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span>Gain hands-on experience with tools</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span>Prepare for professional development</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills you'll gain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[course?.category, 'Problem Solving', 'Project Development', 'Best Practices', 'Modern Tools', 'Industry Standards'].map((skill, index) => (
              <span key={index} className="px-3 py-1 bg-[#001e62]/10 text-[#001e62] rounded-full text-sm font-medium">
                {skill}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderCertificatesTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Award className="w-5 h-5 mr-2" />
          Course Certificate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Course Completion Certificate</h3>
          <p className="text-gray-600 mb-6">
            Complete all course videos and pass the quizzes to earn your certificate
          </p>
          {getProgressPercentage() === 100 ? (
            <Button className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Download Certificate
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="w-full bg-gray-200 rounded-full h-3 max-w-md mx-auto">
                <div
                  className="bg-[#001e62] h-3 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">
                {getProgressPercentage()}% complete - {getTotalVideos() - getCompletedVideos()} videos remaining
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="text-center">
                  <div className="text-xl font-bold text-[#001e62]">{getCompletedVideos()}</div>
                  <div className="text-xs text-gray-600">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-400">{getTotalVideos() - getCompletedVideos()}</div>
                  <div className="text-xs text-gray-600">Remaining</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md border-0 shadow-lg">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 bg-[#001e62]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <PlayCircle className="w-8 h-8 text-[#001e62]" />
            </div>
            <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-6">
              You need to sign in to access course videos and track your progress.
            </p>
            <Link href="/auth/signin">
              <Button size="lg" className="bg-[#001e62] hover:bg-[#001e62]/90">Sign In to Continue</Button>
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
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#001e62] mx-auto mb-4"></div>
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
            <Button className="bg-[#001e62] hover:bg-[#001e62]/90">Back to Course</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Link 
              href={`/course/${params.courseId}`}
              className="flex items-center text-gray-600 hover:text-[#001e62] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="font-medium">Back to course</span>
            </Link>
            
            <div className="hidden md:block">
              <h1 className="font-semibold truncate max-w-md text-gray-900">{course.title}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" className="text-gray-700 border-gray-300">
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Video Player Section */}
      <div className="bg-black">
        <div className="max-w-7xl mx-auto p-4">
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
        <div className="max-w-7xl mx-auto px-6 py-6">
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
                  <span>{Math.round(video.duration ? Math.min((watchTime / video.duration) * 100, 100) : 0)}% watched</span>
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
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'tutorials', label: 'Tutorials', icon: PlayCircle },
              { id: 'quiz', label: 'Quiz', icon: Target },
              { id: 'notes', label: 'Notes', icon: StickyNote },
              { id: 'about', label: 'About', icon: Info },
              { id: 'certificates', label: 'Certificate', icon: Award }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-[#001e62] text-[#001e62]'
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

        {/* Tab Content */}
        <div className="min-h-96">
          {activeTab === 'tutorials' && renderTutorialsTab()}
          {activeTab === 'quiz' && renderQuizTab()}
          {activeTab === 'notes' && renderNotesTab()}
          {activeTab === 'about' && renderAboutTab()}
          {activeTab === 'certificates' && renderCertificatesTab()}
        </div>
      </div>
    </div>
  )
}