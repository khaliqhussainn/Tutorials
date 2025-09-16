// hooks/usePersonalizedLearning.ts - Personalization features
import { useState, useEffect, useCallback } from 'react'

export function usePersonalizedLearning(userId: string, videoId: string) {
  const [learningProfile, setLearningProfile] = useState<any>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [comprehensionScore, setComprehensionScore] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchLearningProfile = useCallback(async () => {
    if (!userId) return

    try {
      const response = await fetch(`/api/ai/learning-profile/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setLearningProfile(data.profile)
        setSuggestions(data.suggestions || [])
        setComprehensionScore(data.comprehensionScore || 0)
      }
    } catch (error) {
      console.error('Failed to fetch learning profile:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const updateLearningPreferences = useCallback(async (preferences: any) => {
    try {
      const response = await fetch('/api/ai/update-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, preferences })
      })

      if (response.ok) {
        await fetchLearningProfile()
      }
    } catch (error) {
      console.error('Failed to update preferences:', error)
    }
  }, [userId, fetchLearningProfile])

  const trackLearningEvent = useCallback(async (event: {
    type: string
    data: any
  }) => {
    try {
      await fetch('/api/ai/track-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          videoId,
          event
        })
      })
    } catch (error) {
      console.error('Failed to track learning event:', error)
    }
  }, [userId, videoId])

  useEffect(() => {
    fetchLearningProfile()
  }, [fetchLearningProfile])

  return {
    learningProfile,
    suggestions,
    comprehensionScore,
    isLoading,
    updateLearningPreferences,
    trackLearningEvent,
    refreshProfile: fetchLearningProfile
  }
}
