// components/transcript/TranscriptViewer.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  Search, 
  Download, 
  Copy, 
  Eye, 
  EyeOff,
  Clock,
  FileText,
  Loader2,
  CheckCircle
} from 'lucide-react'
import { TranscriptUtils } from '@/lib/transcript-utils'

interface TranscriptViewerProps {
  transcript: string
  videoTitle: string
  videoId: string
  showTimestamps?: boolean
  allowSearch?: boolean
  allowDownload?: boolean
}

export default function TranscriptViewer({
  transcript,
  videoTitle,
  videoId,
  showTimestamps = true,
  allowSearch = true,
  allowDownload = true
}: TranscriptViewerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showFullTranscript, setShowFullTranscript] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    // Highlight search results in the transcript
    if (term && transcript) {
      const results = TranscriptUtils.searchInTranscript(transcript, term)
      console.log('Search results:', results)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcript)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy transcript:', error)
    }
  }

  const downloadTranscript = () => {
    const blob = new Blob([transcript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${videoTitle.replace(/[^a-z0-9]/gi, '_')}_transcript.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term) return text
    
    const regex = new RegExp(`(${term})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
  }

  const displayTranscript = showFullTranscript ? transcript : transcript.substring(0, 500) + '...'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Video Transcript
          </div>
          <div className="flex items-center gap-2">
            {allowSearch && (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search transcript..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 w-48"
                />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFullTranscript(!showFullTranscript)}
            >
              {showFullTranscript ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showFullTranscript ? 'Collapse' : 'Expand'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            {allowDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTranscript}
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Transcript Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {transcript.split(' ').length.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Words</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {transcript.length.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Characters</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {Math.ceil(transcript.split(' ').length / 200)}
              </div>
              <div className="text-sm text-gray-600">Est. Reading Time (min)</div>
            </div>
          </div>

          {/* Search Results */}
          {searchTerm && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Searching for: <strong>"{searchTerm}"</strong>
              </p>
            </div>
          )}

          {/* Transcript Content */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 max-h-96 overflow-y-auto">
            <div 
              className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: highlightSearchTerm(displayTranscript, searchTerm)
              }}
            />
            
            {!showFullTranscript && transcript.length > 500 && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowFullTranscript(true)}
                >
                  Show Full Transcript
                </Button>
              </div>
            )}
          </div>

          {/* Transcript Quality Info */}
          <div className="text-xs text-gray-500 flex items-center justify-between">
            <span>Auto-generated transcript • May contain errors</span>
            <span>Last updated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
