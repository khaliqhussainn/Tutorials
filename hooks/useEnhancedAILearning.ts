// hooks/useEnhancedAILearning.ts - Comprehensive hook for all AI learning features
import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface UseEnhancedAILearningProps {
  videoId: string
  videoTitle: string
  transcript?: string
  courseTitle?: string
  courseCategory?: string
}

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  isLoading?: boolean
}

interface LearningStep {
  id: number
  title: string
  description: string
  category: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  estimatedTime: string
  status: 'completed' | 'current' | 'upcoming'
  skills: string[]
}

interface StudyNote {
  id: string
  title: string
  content: string
  keyPoints: string[]
  summary: string
  difficulty: string
  estimatedTime: string
  tags: string[]
  createdAt: string
}

export function useEnhancedAILearning({
  videoId,
  videoTitle,
  transcript,
  courseTitle,
  courseCategory
}: UseEnhancedAILearningProps) {
  const { data: session } = useSession()
  
  // Q&A Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isAILoading, setIsAILoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Learning Journey State
  const [learningPath, setLearningPath] = useState<LearningStep[]>([])
  const [isPathLoading, setIsPathLoading] = useState(false)
  const [pathError, setPathError] = useState<string | null>(null)

  // Study Notes State
  const [studyNotes, setStudyNotes] = useState<StudyNote | null>(null)
  const [isNotesLoading, setIsNotesLoading] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)

  // 1. AI Q&A Functions
  const askAI = useCallback(async (question: string, type: string = 'question') => {
    if (!question.trim() || !session?.user) return null

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: question,
      timestamp: new Date()
    }

    const loadingMessage: ChatMessage = {
      id: `loading-${Date.now()}`,
      type: 'ai',
      content: 'Thinking...',
      timestamp: new Date(),
      isLoading: true
    }

    setChatMessages(prev => [...prev, userMessage, loadingMessage])
    setIsAILoading(true)
    setAiError(null)

    try {
      const response = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: question,
          videoId,
          videoTitle,
          transcript,
          courseTitle,
          courseCategory,
          type,
          context: chatMessages.slice(-3)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: data.content,
        timestamp: new Date()
      }

      setChatMessages(prev => 
        prev.filter(msg => !msg.isLoading).concat([userMessage, aiMessage])
      )

      return data
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }

      setChatMessages(prev => 
        prev.filter(msg => !msg.isLoading).concat([userMessage, errorMessage])
      )

      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setAiError(errorMsg)
      return null
    } finally {
      setIsAILoading(false)
    }
  }, [videoId, videoTitle, transcript, courseTitle, courseCategory, session, chatMessages])

  // 2. Learning Journey Functions
  const generateLearningPath = useCallback(async (currentProgress: number = 0) => {
    setIsPathLoading(true)
    setPathError(null)

    try {
      const response = await fetch('/api/ai/learning-journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTitle,
          courseTitle,
          courseCategory,
          description: `Learning about ${videoTitle}`,
          currentProgress
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate learning path')
      }

      const data = await response.json()
      setLearningPath(data.steps || [])
      return data.steps
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate learning path'
      setPathError(errorMsg)
      console.error('Learning path error:', err)
      return []
    } finally {
      setIsPathLoading(false)
    }
  }, [videoTitle, courseTitle, courseCategory])

  // 3. Study Notes Functions
  const generateStudyNotes = useCallback(async () => {
    if (!transcript) {
      setNotesError('No transcript available for note generation')
      return null
    }

    setIsNotesLoading(true)
    setNotesError(null)

    try {
      const response = await fetch('/api/ai/study-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          videoTitle,
          transcript,
          courseTitle,
          courseCategory
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate study notes')
      }

      const data = await response.json()
      setStudyNotes(data.notes)
      return data.notes
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate study notes'
      setNotesError(errorMsg)
      console.error('Study notes error:', err)
      return null
    } finally {
      setIsNotesLoading(false)
    }
  }, [videoId, videoTitle, transcript, courseTitle, courseCategory])

  // Convenience functions for common AI interactions
  const explainConcept = useCallback(async (concept: string) => {
    return askAI(`Explain the concept of ${concept} from this lesson in simple terms`, 'explanation')
  }, [askAI])

  const getSummary = useCallback(async () => {
    return askAI('Create a comprehensive summary of the key points covered in this lesson', 'summary')
  }, [askAI])

  const getPracticeQuestions = useCallback(async () => {
    return askAI('Generate some practice questions to test my understanding of this lesson', 'quiz')
  }, [askAI])

  const getStudyTips = useCallback(async () => {
    return askAI('Give me some study tips and strategies for mastering this topic', 'general')
  }, [askAI])

  // Utility functions
  const clearChatHistory = useCallback(() => {
    setChatMessages([])
    setAiError(null)
  }, [])

  const downloadNotes = useCallback(() => {
    if (!studyNotes) return

    const notesText = `${studyNotes.title}\n\n${studyNotes.content}\n\nKey Points:\n${studyNotes.keyPoints.map(point => `• ${point}`).join('\n')}\n\nSummary:\n${studyNotes.summary}`
    
    const blob = new Blob([notesText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${videoTitle}-notes.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [studyNotes, videoTitle])

  const refreshAll = useCallback(async (currentProgress: number = 0) => {
    await Promise.all([
      generateLearningPath(currentProgress),
      generateStudyNotes()
    ])
  }, [generateLearningPath, generateStudyNotes])

  // Initialize data when component mounts or video changes
  useEffect(() => {
    if (videoId && session?.user) {
      generateLearningPath(0)
      if (transcript) {
        generateStudyNotes()
      }
    }
  }, [videoId, session, generateLearningPath, generateStudyNotes, transcript])

  return {
    // Q&A Chat
    chatMessages,
    isAILoading,
    aiError,
    askAI,
    explainConcept,
    getSummary,
    getPracticeQuestions,
    getStudyTips,
    clearChatHistory,

    // Learning Journey
    learningPath,
    isPathLoading,
    pathError,
    generateLearningPath,

    // Study Notes
    studyNotes,
    isNotesLoading,
    notesError,
    generateStudyNotes,
    downloadNotes,

    // Utility functions
    refreshAll,
    
    // State checks
    isReady: !!session?.user,
    hasTranscript: !!transcript,
    hasAnyContent: chatMessages.length > 0 || learningPath.length > 0 || !!studyNotes
  }
}