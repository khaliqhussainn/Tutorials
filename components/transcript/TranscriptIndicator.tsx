// components/TranscriptIndicator.tsx
import { FileText, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface TranscriptIndicatorProps {
  videoId: string
  videoTitle: string
  hasTranscript: boolean
  showDownload?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function TranscriptIndicator({ 
  videoId, 
  videoTitle, 
  hasTranscript, 
  showDownload = false,
  size = 'sm',
  className = '' 
}: TranscriptIndicatorProps) {
  const downloadTranscript = async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}/transcript`)
      if (response.ok) {
        const data = await response.json()
        const transcriptText = data.segments
          .map((segment: any) => 
            `[${formatTime(segment.startTime)}] ${segment.speakerName ? `${segment.speakerName}: ` : ''}${segment.text}`
          )
          .join('\n\n')
        
        const blob = new Blob([transcriptText], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${videoTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_transcript.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading transcript:', error)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!hasTranscript) {
    return null
  }

  const iconSize = size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3 h-3'
  const textSize = size === 'lg' ? 'text-sm' : size === 'md' ? 'text-xs' : 'text-xs'

  return (
    <div className={`flex items-center ${className}`}>
      <div className={`flex items-center text-blue-600 ${textSize}`}>
        <FileText className={`${iconSize} mr-1`} />
        <span>Transcript</span>
      </div>
      
      {showDownload && (
        <Button
          variant="ghost"
          size="sm"
          onClick={downloadTranscript}
          className="ml-2 p-1 h-auto"
          title="Download Transcript"
        >
          <Download className="w-3 h-3" />
        </Button>
      )}
    </div>
  )
}