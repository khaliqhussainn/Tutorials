// lib/ai-voice.ts - Voice interaction utilities
export class VoiceManager {
  private synthesis: SpeechSynthesis | null = null
  private recognition: any = null
  private isListening = false
  private isSpeaking = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis
      
      // Initialize speech recognition
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition()
        this.recognition.continuous = false
        this.recognition.interimResults = false
        this.recognition.lang = 'en-US'
      }
    }
  }

  async speak(text: string, options: {
    rate?: number
    pitch?: number
    volume?: number
    voice?: string
    onStart?: () => void
    onEnd?: () => void
  } = {}): Promise<void> {
    if (!this.synthesis || !text) return

    return new Promise((resolve, reject) => {
      if (this.isSpeaking) {
        this.synthesis!.cancel()
      }

      const utterance = new SpeechSynthesisUtterance(text)
      
      // Apply options
      utterance.rate = options.rate || 0.8
      utterance.pitch = options.pitch || 1
      utterance.volume = options.volume || 0.8

      // Set voice if specified
      if (options.voice) {
        const voices = this.synthesis!.getVoices()
        const selectedVoice = voices.find(voice => voice.name.includes(options.voice!))
        if (selectedVoice) {
          utterance.voice = selectedVoice
        }
      }

      utterance.onstart = () => {
        this.isSpeaking = true
        options.onStart?.()
      }

      utterance.onend = () => {
        this.isSpeaking = false
        options.onEnd?.()
        resolve()
      }

      utterance.onerror = (event) => {
        this.isSpeaking = false
        reject(new Error(`Speech synthesis error: ${event.error}`))
      }

      this.synthesis!.speak(utterance)
    })
  }

  stopSpeaking(): void {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.cancel()
      this.isSpeaking = false
    }
  }

  async listen(options: {
    onResult?: (text: string) => void
    onStart?: () => void
    onEnd?: () => void
    onError?: (error: string) => void
  } = {}): Promise<string> {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported')
    }

    return new Promise((resolve, reject) => {
      if (this.isListening) {
        this.recognition.stop()
      }

      this.recognition.onstart = () => {
        this.isListening = true
        options.onStart?.()
      }

      this.recognition.onend = () => {
        this.isListening = false
        options.onEnd?.()
      }

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        options.onResult?.(transcript)
        resolve(transcript)
      }

      this.recognition.onerror = (event: any) => {
        this.isListening = false
        const error = `Speech recognition error: ${event.error}`
        options.onError?.(error)
        reject(new Error(error))
      }

      this.recognition.start()
    })
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }
  }

  getSupportedVoices(): SpeechSynthesisVoice[] {
    return this.synthesis?.getVoices() || []
  }

  get isCurrentlySpeaking(): boolean {
    return this.isSpeaking
  }

  get isCurrentlyListening(): boolean {
    return this.isListening
  }
}

// lib/ai-progress-tracker.ts - Learning progress tracking
export class AIProgressTracker {
  static async updateEngagementMetrics(
    userId: string,
    videoId: string,
    metrics: {
      questionsAsked: number
      notesGenerated: number
      conceptsExplored: number
      timeSpent: number
      interactionQuality: number
    }
  ): Promise<void> {
    try {
      await fetch('/api/ai/update-engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          videoId,
          metrics,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Failed to update engagement metrics:', error)
    }
  }

  static async calculateLearningVelocity(
    userId: string,
    timeframe: 'week' | 'month' | 'quarter' = 'week'
  ): Promise<{
    videosCompleted: number
    avgComprehensionScore: number
    aiInteractions: number
    learningStreak: number
  }> {
    try {
      const response = await fetch(`/api/ai/learning-velocity/${userId}?timeframe=${timeframe}`)
      
      if (response.ok) {
        return await response.json()
      }
      
      return {
        videosCompleted: 0,
        avgComprehensionScore: 0,
        aiInteractions: 0,
        learningStreak: 0
      }
    } catch (error) {
      console.error('Failed to calculate learning velocity:', error)
      return {
        videosCompleted: 0,
        avgComprehensionScore: 0,
        aiInteractions: 0,
        learningStreak: 0
      }
    }
  }

  static async generateLearningInsights(
    userId: string
  ): Promise<{
    strengths: string[]
    areasForImprovement: string[]
    recommendations: string[]
    nextGoals: string[]
  }> {
    try {
      const response = await fetch(`/api/ai/learning-insights/${userId}`)
      
      if (response.ok) {
        return await response.json()
      }
      
      return {
        strengths: [],
        areasForImprovement: [],
        recommendations: [],
        nextGoals: []
      }
    } catch (error) {
      console.error('Failed to generate learning insights:', error)
      return {
        strengths: [],
        areasForImprovement: [],
        recommendations: [],
        nextGoals: []
      }
    }
  }
}