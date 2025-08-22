// components/admin/TranscriptDashboard.tsx - Admin dashboard for managing transcript generation
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  FileText, 
  Play, 
  Pause, 
  RefreshCw, 
  Trash2, 
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  BarChart3,
  Settings
} from 'lucide-react'

interface QueueStatus {
  pending: number
  processing: number
  completed: number
  failed: number
  total: number
  currentJob?: string
}

interface TranscriptJob {
  id: string
  videoId: string
  videoUrl: string
  priority: number
  status: string
  attempts: number
  maxAttempts: number
  error?: string
}

export default function TranscriptDashboard() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)
  const [jobs, setJobs] = useState<TranscriptJob[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchQueueStatus()
    const interval = setInterval(fetchQueueStatus, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchQueueStatus = async () => {
    try {
      const response = await fetch('/api/admin/transcript-queue/status')
      if (response.ok) {
        const data = await response.json()
        setQueueStatus(data.status)
        setJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('Error fetching queue status:', error)
    }
  }

  const queueAllVideos = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/transcript-queue/queue-all', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(`✅ Queued ${data.count} videos for transcript generation`)
        fetchQueueStatus()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to queue videos')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const retryFailed = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/transcript-queue/retry-failed', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(`🔄 Retrying ${data.count} failed jobs`)
        fetchQueueStatus()
      }
    } catch (error) {
      setError('Failed to retry jobs')
    } finally {
      setLoading(false)
    }
  }

  const clearFailed = async () => {
    if (!confirm('Are you sure you want to clear all failed jobs?')) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/transcript-queue/clear-failed', {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(`🗑️ Cleared ${data.count} failed jobs`)
        fetchQueueStatus()
      }
    } catch (error) {
      setError('Failed to clear failed jobs')
    } finally {
      setLoading(false)
    }
  }

  const clearAll = async () => {
    if (!confirm('Are you sure you want to clear ALL jobs? This will stop all processing.')) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/transcript-queue/clear-all', {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(`🗑️ Cleared all ${data.count} jobs`)
        fetchQueueStatus()
      }
    } catch (error) {
      setError('Failed to clear all jobs')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'processing': return 'text-blue-600 bg-blue-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'processing': return <Loader2 className="w-4 h-4 animate-spin" />
      case 'failed': return <AlertCircle className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transcript Management</h2>
          <p className="text-gray-600">Monitor and manage automatic transcript generation</p>
        </div>
        <Button onClick={fetchQueueStatus} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {queueStatus?.pending || 0}
                </p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Loader2 className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {queueStatus?.processing || 0}
                </p>
                <p className="text-sm text-gray-600">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {queueStatus?.completed || 0}
                </p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {queueStatus?.failed || 0}
                </p>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Queue Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={queueAllVideos}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              Queue All Videos
            </Button>

            {queueStatus && queueStatus.failed > 0 && (
              <>
                <Button
                  onClick={retryFailed}
                  disabled={loading}
                  variant="outline"
                  className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Failed ({queueStatus.failed})
                </Button>

                <Button
                  onClick={clearFailed}
                  disabled={loading}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Failed
                </Button>
              </>
            )}

            {queueStatus && queueStatus.total > 0 && (
              <Button
                onClick={clearAll}
                disabled={loading}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Jobs
              </Button>
            )}
          </div>

          {queueStatus?.currentJob && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Currently Processing:</strong> Video {queueStatus.currentJob}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Queue */}
      {jobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Job Queue ({jobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${getStatusColor(job.status)}`}>
                      {getStatusIcon(job.status)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Video: {job.videoId.substring(0, 8)}...
                      </p>
                      <p className="text-sm text-gray-600">
                        Priority: {job.priority} • Attempts: {job.attempts}/{job.maxAttempts}
                      </p>
                      {job.error && (
                        <p className="text-sm text-red-600 mt-1">
                          Error: {job.error}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none text-sm text-gray-700">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Automatic Transcripts</h4>
                <ul className="space-y-1 text-sm">
                  <li>• New videos are automatically queued for transcript generation</li>
                  <li>• Transcripts are generated using OpenAI Whisper API</li>
                  <li>• Processing happens in the background without blocking uploads</li>
                  <li>• Failed jobs are automatically retried up to 3 times</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Manual Controls</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Use "Queue All Videos" to process existing videos without transcripts</li>
                  <li>• Retry failed jobs if there were temporary issues</li>
                  <li>• Clear failed jobs to remove permanently failed items</li>
                  <li>• Monitor progress with real-time status updates</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}