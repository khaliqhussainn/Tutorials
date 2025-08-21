// components/admin/TranscriptManager.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  FileText, 
  Download, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  Zap,
  AlertCircle
} from 'lucide-react'

interface TranscriptManagerProps {
  videoId: string
  videoTitle: string
  initialTranscript?: string
  onTranscriptUpdate?: (transcript: string) => void
}

export default function TranscriptManager({ 
  videoId, 
  videoTitle, 
  initialTranscript,
  onTranscriptUpdate 
}: TranscriptManagerProps) {
  const [transcript, setTranscript] = useState(initialTranscript || '')
  const [loading, setLoading] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const generateTranscript = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/videos/${videoId}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok) {
        setTranscript(data.transcript)
        setSuccess(`Transcript generated successfully! Confidence: ${Math.round((data.confidence || 0) * 100)}%`)
        onTranscriptUpdate?.(data.transcript)
      } else {
        setError(data.error || 'Failed to generate transcript')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const deleteTranscript = async () => {
    if (!confirm('Are you sure you want to delete this transcript?')) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/videos/${videoId}/transcript`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setTranscript('')
        setSuccess('Transcript deleted successfully')
        onTranscriptUpdate?.('')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete transcript')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const downloadTranscript = () => {
    if (!transcript) return

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

  const copyToClipboard = async () => {
    if (!transcript) return

    try {
      await navigator.clipboard.writeText(transcript)
      setSuccess('Transcript copied to clipboard!')
    } catch (error) {
      setError('Failed to copy transcript')
    }
  }

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Video Transcript
          </div>
          <div className="flex items-center gap-2">
            {transcript && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTranscript(!showTranscript)}
                >
                  {showTranscript ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showTranscript ? 'Hide' : 'Show'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTranscript}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteTranscript}
                  disabled={loading}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Messages */}
        {error && (
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <XCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Transcript Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            {transcript ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Transcript Available</p>
                  <p className="text-sm text-gray-600">
                    {transcript.length.toLocaleString()} characters
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-orange-500 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">No Transcript</p>
                  <p className="text-sm text-gray-600">
                    Generate a transcript using AI
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            {transcript ? (
              <Button
                onClick={generateTranscript}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Regenerate
              </Button>
            ) : (
              <Button
                onClick={generateTranscript}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Generate Transcript
              </Button>
            )}
          </div>
        </div>

        {/* Transcript Content */}
        {transcript && showTranscript && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Transcript Content</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
              >
                Copy to Clipboard
              </Button>
            </div>
            
            <div className="max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg p-4">
              <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                {transcript}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center p-8 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
            <div className="text-center">
              <p className="font-medium text-blue-900">Generating Transcript</p>
              <p className="text-sm text-blue-700">
                This may take a few minutes depending on video length...
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
