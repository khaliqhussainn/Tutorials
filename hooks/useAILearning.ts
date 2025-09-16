// hooks/useAILearning.ts - React hook for AI learning features
import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface UseAILearningProps {
  videoId: string
  transcript?: string
  videoTitle: string
}

export function useAILearning({ videoId, transcript, videoTitle }: UseAILearningProps) {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatHistory, setChatHistory] = useState<Array<{
    id: string
    type: 'user' | 'ai'
    content: string
    timestamp: Date
  }>>([])

  const askAI = useCallback(async (question: string, type: string = 'general') => {
    if (!question.trim() || !session?.user) return null

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: question,
          videoId,
          videoTitle,
          transcript,
          type,
          context: chatHistory.slice(-3)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()

      // Add to chat history
      const userMessage = {
        id: `user-${Date.now()}`,
        type: 'user' as const,
        content: question,
        timestamp: new Date()
      }

      const aiMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai' as const,
        content: data.content,
        timestamp: new Date()
      }

      setChatHistory(prev => [...prev, userMessage, aiMessage])

      // Track interaction (fire and forget)
      fetch('/api/ai/track-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          interaction: {
            type,
            query: question,
            response: data.content
          }
        })
      }).catch(console.error)

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [videoId, videoTitle, transcript, session, chatHistory])

  const generateNotes = useCallback(async () => {
    if (!transcript) return null

    return askAI('Generate comprehensive study notes from this lesson', 'notes')
  }, [transcript, askAI])

  const generateSummary = useCallback(async () => {
    return askAI('Create a concise summary of the key points covered', 'summary')
  }, [askAI])

  const explainConcept = useCallback(async (concept: string) => {
    return askAI(`Explain the concept of ${concept} in simple terms`, 'explanation')
  }, [askAI])

  const createQuiz = useCallback(async (difficulty: string = 'medium') => {
    return askAI(`Create practice questions with ${difficulty} difficulty`, 'quiz')
  }, [askAI])

  const clearHistory = useCallback(() => {
    setChatHistory([])
  }, [])

  return {
    isLoading,
    error,
    chatHistory,
    askAI,
    generateNotes,
    generateSummary,
    explainConcept,
    createQuiz,
    clearHistory
  }
}
