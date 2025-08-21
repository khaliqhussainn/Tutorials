// hooks/useTranscript.ts
import { useState, useEffect } from 'react'

interface TranscriptData {
  videoId: string
  title: string
  transcript: string | null
  hasTranscript: boolean
}

interface UseTranscriptReturn {
  transcript: TranscriptData | null
  loading: boolean
  error: string | null
  generateTranscript: () => Promise<void>
  deleteTranscript: () => Promise<void>
  refreshTranscript: () => Promise<void>
}

export function useTranscript(videoId: string): UseTranscriptReturn {
  const [transcript, setTranscript] = useState<TranscriptData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTranscript = async () => {
    if (!videoId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/videos/${videoId}/transcript`)
      
      if (response.ok) {
        const data = await response.json()
        setTranscript(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch transcript')
      }
    } catch (error) {
      setError('Network error while fetching transcript')
    } finally {
      setLoading(false)
    }
  }

  const generateTranscript = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/videos/${videoId}/transcript`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        await fetchTranscript() // Refresh the transcript data
        return data
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate transcript')
      }
    } catch (error: any) {
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteTranscript = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/videos/${videoId}/transcript`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchTranscript() // Refresh the transcript data
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete transcript')
      }
    } catch (error: any) {
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const refreshTranscript = fetchTranscript

  useEffect(() => {
    fetchTranscript()
  }, [videoId])

  return {
    transcript,
    loading,
    error,
    generateTranscript,
    deleteTranscript,
    refreshTranscript
  }
}