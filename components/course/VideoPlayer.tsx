// components/course/VideoPlayer.tsx - Enhanced version
'use client'

import { useState, useEffect, useRef } from 'react'
import ReactPlayer from 'react-player'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { 
  CheckCircle, 
  Lock, 
  Play, 
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Settings,
  PlayCircle
} from 'lucide-react'

interface VideoPlayerProps {
  videoUrl: string
  title: string
  onProgress?: (progress: { played: number; playedSeconds: number }) => void
  onEnded?: () => void
  canWatch: boolean
}

export default function VideoPlayer({ 
  videoUrl, 
  title, 
  onProgress, 
  onEnded, 
  canWatch 
}: VideoPlayerProps) {
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [duration, setDuration] = useState(0)
  const [played, setPlayed] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  
  const playerRef = useRef<ReactPlayer>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false)
        }
      }, 3000)
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('mousemove', handleMouseMove)
      return () => {
        container.removeEventListener('mousemove', handleMouseMove)
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current)
        }
      }
    }
  }, [isPlaying])

  const handlePlay = () => {
    setIsPlaying(true)
    if (!hasStarted) {
      setHasStarted(true)
    }
  }

  const handlePause = () => {
    setIsPlaying(false)
    setShowControls(true)
  }

  const handleProgress = (progress: { played: number; playedSeconds: number }) => {
    setPlayed(progress.played)
    onProgress?.(progress)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTo = parseFloat(e.target.value)
    setPlayed(seekTo)
    playerRef.current?.seekTo(seekTo)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    setMuted(newVolume === 0)
  }

  const toggleMute = () => {
    setMuted(!muted)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleRestart = () => {
    playerRef.current?.seekTo(0)
    setPlayed(0)
  }

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed)
  }

  if (!canWatch) {
    return (
      <Card className="aspect-video bg-gradient-to-br from-dark-100 to-dark-200">
        <CardContent className="h-full flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-dark-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-dark-500" />
            </div>
            <h3 className="text-xl font-semibold text-dark-700 mb-3">Video Locked</h3>
            <p className="text-dark-600 max-w-md">
              Complete the previous video's test to unlock this content and continue your learning journey.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-lg group"
    >
      {!hasStarted ? (
        // Video Thumbnail with Play Button
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 hover:bg-white/30 transition-colors cursor-pointer">
              <PlayCircle 
                className="w-12 h-12 ml-1" 
                onClick={() => setHasStarted(true)}
              />
            </div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-white/80 text-sm">Click to start watching</p>
          </div>
        </div>
      ) : (
        <>
          {/* React Player */}
          <ReactPlayer
            ref={playerRef}
            url={videoUrl}
            width="100%"
            height="100%"
            playing={isPlaying}
            volume={muted ? 0 : volume}
            playbackRate={playbackRate}
            onReady={() => setIsReady(true)}
            onDuration={setDuration}
            onProgress={handleProgress}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={onEnded}
            controls={false} // We'll use custom controls
            config={{
              file: {
                attributes: {
                  controlsList: 'nodownload',
                  disablePictureInPicture: true
                }
              }
            }}
          />

          {/* Custom Controls Overlay */}
          <div 
            className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Center Play/Pause Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                variant="ghost"
                size="lg"
                className="w-16 h-16 rounded-full bg-black/40 hover:bg-black/60 text-white border-2 border-white/20"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </Button>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={played}
                  onChange={handleSeek}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer range-slider"
                />
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Play/Pause */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>

                  {/* Restart */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={handleRestart}
                  >
                    <RotateCcw className="w-5 h-5" />
                  </Button>

                  {/* Volume */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      onClick={toggleMute}
                    >
                      {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={muted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Time Display */}
                  <div className="text-white text-sm font-medium">
                    {formatTime(played * duration)} / {formatTime(duration)}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Playback Speed */}
                  <div className="relative group">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                    >
                      <Settings className="w-5 h-5" />
                    </Button>
                    <div className="absolute bottom-full right-0 mb-2 bg-black/80 backdrop-blur-sm rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="text-white text-xs mb-2">Playback Speed</div>
                      <div className="flex flex-col space-y-1">
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                          <button
                            key={speed}
                            onClick={() => handleSpeedChange(speed)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              playbackRate === speed 
                                ? 'bg-primary-600 text-white' 
                                : 'text-white/80 hover:bg-white/20'
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Fullscreen */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={toggleFullscreen}
                  >
                    <Maximize className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Loading State */}
      {hasStarted && !isReady && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading video...</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .range-slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .range-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  )
}