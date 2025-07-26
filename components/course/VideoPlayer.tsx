// components/course/EnhancedVideoPlayer.tsx - Better video player with controls
'use client'

import { useRef, useEffect, useState } from 'react'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  SkipBack, 
  SkipForward,
  Settings
} from 'lucide-react'

interface VideoPlayerProps {
  videoUrl: string
  title: string
  onProgress: (progress: { played: number; playedSeconds: number }) => void
  onEnded: () => void
  canWatch: boolean
}

export default function EnhancedVideoPlayer({ 
  videoUrl, 
  title, 
  onProgress, 
  onEnded, 
  canWatch 
}: VideoPlayerProps) {
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
            <Play className="w-10 h-10 text-gray-500" />
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
