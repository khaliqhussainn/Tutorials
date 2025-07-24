// components/course/VideoPlayer.tsx
'use client'

import { useState, useEffect } from 'react'
import ReactPlayer from 'react-player'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Lock, Play } from 'lucide-react'

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
  const [hasStarted, setHasStarted] = useState(false)

  if (!canWatch) {
    return (
      <div className="aspect-video bg-dark-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Lock className="w-12 h-12 text-dark-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-dark-700 mb-2">Video Locked</h3>
          <p className="text-dark-500">Complete the previous video's test to unlock this content.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
      {!hasStarted && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <Button
            size="lg"
            onClick={() => setHasStarted(true)}
            className="rounded-full w-16 h-16 p-0"
          >
            <Play className="w-6 h-6 ml-1" />
          </Button>
        </div>
      )}
      
      {hasStarted && (
        <ReactPlayer
          url={videoUrl}
          width="100%"
          height="100%"
          controls
          onReady={() => setIsReady(true)}
          onProgress={onProgress}
          onEnded={onEnded}
          config={{
            file: {
              attributes: {
                controlsList: 'nodownload'
              }
            }
          }}
        />
      )}
    </div>
  )
}