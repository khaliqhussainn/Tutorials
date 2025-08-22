// components/VideoPlayerWithTranscript.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  SkipBack, 
  SkipForward, 
  Settings,
  Lock,
  FileText,
  Download,
  Search,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface TranscriptSegment {
  id: string
  startTime: number
  endTime: number
  text: string
  speakerName?: string
}

interface VideoPlayerWithTranscriptProps {
  videoUrl: string
  title: string
  videoId: string
  onProgress: (progress: { played: number; playedSeconds: number }) => void
  onEnded: () => void
  canWatch: boolean
  initialTime?: number
}

export function VideoPlayerWithTranscript({
  videoUrl,
  title,
  videoId,
  onProgress,
  onEnded,
  canWatch,
  initialTime = 0
}: VideoPlayerWithTranscriptProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)
  
  // Video player state
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSettings, setShowSettings] = useState(false)
  const [buffered, setBuffered] = useState(0)
  
  // Transcript state
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([])
  const [showTranscript, setShowTranscript] = useState(false)
  const [transcriptLoading, setTranscriptLoading] = useState(false)
  const [activeSegment, setActiveSegment] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredTranscript, setFilteredTranscript] = useState<TranscriptSegment[]>([])
  const [transcriptCollapsed, setTranscriptCollapsed] = useState(false)

  // Fetch transcript data
  useEffect(() => {
    if (videoId && canWatch) {
      fetchTranscript()
    }
  }, [videoId, canWatch])

  const fetchTranscript = async () => {
    try {
      setTranscriptLoading(true)
      const response = await fetch(`/api/videos/${videoId}/transcript`)
      
      if (response.ok) {
        const data = await response.json()
        setTranscript(data.segments || [])
        setFilteredTranscript(data.segments || [])
      }
    } catch (error) {
      console.error('Error fetching transcript:', error)
    } finally {
      setTranscriptLoading(false)
    }
  }

  // Filter transcript based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTranscript(transcript)
    } else {
      const filtered = transcript.filter(segment =>
        segment.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        segment.speakerName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredTranscript(filtered)
    }
  }, [searchQuery, transcript])

  // Update active segment based on current time
  useEffect(() => {
    const currentSegment = transcript.find(segment =>
      currentTime >= segment.startTime && currentTime <= segment.endTime
    )
    setActiveSegment(currentSegment?.id || null)

    // Auto-scroll to active segment
    if (currentSegment && transcriptRef.current) {
      const segmentElement = transcriptRef.current.querySelector(`[data-segment-id="${currentSegment.id}"]`)
      if (segmentElement) {
        segmentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }
    }
  }, [currentTime, transcript])

  // Video player effects and handlers
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

  const togglePlay = () => {
    if (!videoRef.current) return
    
    if (playing) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch(console.error)
    }
  }

  const seekToTime = (time: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = time
    setCurrentTime(time)
  }

  const toggleTranscript = () => {
    setShowTranscript(!showTranscript)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const downloadTranscript = () => {
    const transcriptText = transcript
      .map(segment => `[${formatTime(segment.startTime)}] ${segment.speakerName ? `${segment.speakerName}: ` : ''}${segment.text}`)
      .join('\n\n')
    
    const blob = new Blob([transcriptText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_transcript.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
        </div>
      </div>
    )
  }

  return (
    <div className={`grid ${showTranscript ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
      {/* Video Player */}
      <div className={showTranscript ? 'lg:col-span-2' : 'col-span-1'}>
        <div 
          ref={containerRef}
          className="relative aspect-video bg-black rounded-lg overflow-hidden group cursor-pointer shadow-2xl"
          onMouseEnter={() => setShowControls(true)}
          onMouseMove={() => setShowControls(true)}
          onClick={togglePlay}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            preload="metadata"
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

            {/* Video Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <span className="text-white text-sm font-mono">
                  {formatTime(currentTime)}
                </span>
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={duration ? (currentTime / duration) * 100 : 0}
                    onChange={(e) => {
                      if (!videoRef.current) return
                      const time = (parseFloat(e.target.value) / 100) * duration
                      videoRef.current.currentTime = time
                      setCurrentTime(time)
                    }}
                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
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
                      if (videoRef.current) {
                        videoRef.current.currentTime = Math.max(0, currentTime - 10)
                      }
                    }}
                    className="text-white hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-white/10"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (videoRef.current) {
                        videoRef.current.currentTime = Math.min(duration, currentTime + 10)
                      }
                    }}
                    className="text-white hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-white/10"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex items-center space-x-3">
                  {transcript.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleTranscript()
                      }}
                      className={`text-white hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-white/10 ${
                        showTranscript ? 'bg-blue-600' : ''
                      }`}
                      title="Toggle Transcript"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (containerRef.current) {
                        if (document.fullscreenElement) {
                          document.exitFullscreen()
                        } else {
                          containerRef.current.requestFullscreen()
                        }
                      }
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
      </div>

      {/* Transcript Panel */}
      {showTranscript && (
        <div className="lg:col-span-1">
          <Card className="h-full max-h-[600px] flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-lg">
                  <FileText className="w-5 h-5 mr-2" />
                  Transcript
                  {transcriptCollapsed && (
                    <button
                      onClick={() => setTranscriptCollapsed(false)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  )}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {transcript.length > 0 && (
                    <button
                      onClick={downloadTranscript}
                      className="text-gray-400 hover:text-gray-600 p-1"
                      title="Download Transcript"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setTranscriptCollapsed(!transcriptCollapsed)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    {transcriptCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setShowTranscript(false)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {!transcriptCollapsed && transcript.length > 0 && (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transcript..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#001e62] focus:border-transparent"
                  />
                </div>
              )}
            </CardHeader>

            {!transcriptCollapsed && (
              <CardContent className="flex-1 overflow-hidden p-0">
                {transcriptLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#001e62]"></div>
                  </div>
                ) : transcript.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <FileText className="w-12 h-12 mb-2 text-gray-300" />
                    <p className="text-sm">No transcript available</p>
                  </div>
                ) : (
                  <div 
                    ref={transcriptRef}
                    className="h-full overflow-y-auto px-6 pb-6 space-y-3"
                  >
                    {filteredTranscript.map((segment) => (
                      <div
                        key={segment.id}
                        data-segment-id={segment.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                          activeSegment === segment.id
                            ? 'bg-[#001e62]/10 border-l-4 border-l-[#001e62]'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => seekToTime(segment.startTime)}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {formatTime(segment.startTime)}
                          </span>
                          {segment.speakerName && (
                            <span className="text-xs font-medium text-gray-500">
                              {segment.speakerName}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm leading-relaxed ${
                          activeSegment === segment.id ? 'text-[#001e62] font-medium' : 'text-gray-700'
                        }`}>
                          {searchQuery && (
                            <span dangerouslySetInnerHTML={{
                              __html: segment.text.replace(
                                new RegExp(`(${searchQuery})`, 'gi'),
                                '<mark class="bg-yellow-200">$1</mark>'
                              )
                            }} />
                          )}
                          {!searchQuery && segment.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}