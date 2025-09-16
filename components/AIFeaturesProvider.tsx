
// components/AIFeaturesProvider.tsx - Context provider for AI features
import React, { createContext, useContext, useState, useCallback } from 'react'

interface AIFeaturesContextType {
  isAIEnabled: boolean
  voiceMode: boolean
  setVoiceMode: (enabled: boolean) => void
  chatHistory: Array<{ id: string; type: 'user' | 'ai'; content: string; timestamp: Date }>
  addToChatHistory: (message: any) => void
  clearChatHistory: () => void
  aiPreferences: {
    autoGenerateNotes: boolean
    enableVoice: boolean
    responseSpeed: 'slow' | 'normal' | 'fast'
  }
  updateAIPreferences: (prefs: Partial<{
    autoGenerateNotes: boolean
    enableVoice: boolean
    responseSpeed: 'slow' | 'normal' | 'fast'
  }>) => void
}

const AIFeaturesContext = createContext<AIFeaturesContextType | undefined>(undefined)

export function AIFeaturesProvider({ children }: { children: React.ReactNode }) {
  const [voiceMode, setVoiceMode] = useState(false)
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [aiPreferences, setAIPreferences] = useState({
    autoGenerateNotes: true,
    enableVoice: false,
    responseSpeed: 'normal' as const
  })

  const addToChatHistory = useCallback((message: any) => {
    setChatHistory(prev => [...prev, message])
  }, [])

  const clearChatHistory = useCallback(() => {
    setChatHistory([])
  }, [])

  const updateAIPreferences = useCallback((prefs: Partial<typeof aiPreferences>) => {
    setAIPreferences(prev => ({ ...prev, ...prefs }))
  }, [])

  const value = {
    isAIEnabled: true, // Can be toggled based on subscription/feature flags
    voiceMode,
    setVoiceMode,
    chatHistory,
    addToChatHistory,
    clearChatHistory,
    aiPreferences,
    updateAIPreferences
  }

  return (
    <AIFeaturesContext.Provider value={value}>
      {children}
    </AIFeaturesContext.Provider>
  )
}

export function useAIFeatures() {
  const context = useContext(AIFeaturesContext)
  if (context === undefined) {
    throw new Error('useAIFeatures must be used within an AIFeaturesProvider')
  }
  return context
}