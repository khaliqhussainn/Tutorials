// components/course/VideoNavigation.tsx - Next/Previous navigation
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, ArrowRight, CheckCircle, Lock } from 'lucide-react'

interface VideoInfo {
  id: string
  title: string
  canAccess?: boolean
}

interface VideoNavigationProps {
  courseId: string
  currentVideoId: string
  previousVideo?: VideoInfo
  nextVideo?: VideoInfo
  testPassed: boolean
  showTest: () => void
}

export default function VideoNavigation({
  courseId,
  currentVideoId,
  previousVideo,
  nextVideo,
  testPassed,
  showTest
}: VideoNavigationProps) {
  return (
    <div className="flex justify-between items-center gap-4 mt-8">
      {/* Previous Video */}
      <div className="flex-1">
        {previousVideo ? (
          <Link href={`/course/${courseId}/video/${previousVideo.id}`}>
            <Button 
              variant="outline" 
              className="w-full max-w-xs h-auto p-4 text-left"
            >
              <div className="flex items-center">
                <ArrowLeft className="w-4 h-4 mr-3 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground mb-1">Previous</div>
                  <div className="font-medium truncate">{previousVideo.title}</div>
                </div>
              </div>
            </Button>
          </Link>
        ) : (
          <div /> // Empty div for spacing
        )}
      </div>

      {/* Test Button */}
      {!testPassed && (
        <Button onClick={showTest} size="lg" className="px-8">
          Take Knowledge Check
        </Button>
      )}

      {/* Next Video */}
      <div className="flex-1 flex justify-end">
        {nextVideo ? (
          testPassed ? (
            <Link href={`/course/${courseId}/video/${nextVideo.id}`}>
              <Button className="w-full max-w-xs h-auto p-4 text-right">
                <div className="flex items-center">
                  <div className="min-w-0 mr-3">
                    <div className="text-xs text-primary-100 mb-1">Next</div>
                    <div className="font-medium truncate">{nextVideo.title}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 flex-shrink-0" />
                </div>
              </Button>
            </Link>
          ) : (
            <Button 
              disabled 
              variant="outline" 
              className="w-full max-w-xs h-auto p-4 text-right opacity-60"
            >
              <div className="flex items-center">
                <div className="min-w-0 mr-3">
                  <div className="text-xs text-muted-foreground mb-1">Next</div>
                  <div className="font-medium truncate">{nextVideo.title}</div>
                </div>
                <Lock className="w-4 h-4 flex-shrink-0" />
              </div>
            </Button>
          )
        ) : (
          <div /> // Empty div for spacing
        )}
      </div>
    </div>
  )
}