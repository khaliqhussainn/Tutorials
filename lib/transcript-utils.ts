// lib/transcript-utils.ts
export class TranscriptUtils {
  // Format transcript with timestamps for better readability
  static formatWithTimestamps(transcript: string, segments?: any[]): string {
    if (!segments || segments.length === 0) {
      return transcript
    }

    const formattedSegments: string[] = []
    let currentTime = 0
    let currentText = ''

    for (const segment of segments) {
      if (segment.start >= currentTime + 30) { // Every 30 seconds
        if (currentText.trim()) {
          const timestamp = this.formatTimestamp(currentTime)
          formattedSegments.push(`[${timestamp}] ${currentText.trim()}`)
        }
        currentTime = Math.floor(segment.start / 30) * 30
        currentText = segment.text
      } else {
        currentText += ` ${segment.text}`
      }
    }

    // Add final segment
    if (currentText.trim()) {
      const timestamp = this.formatTimestamp(currentTime)
      formattedSegments.push(`[${timestamp}] ${currentText.trim()}`)
    }

    return formattedSegments.join('\n\n')
  }

  // Convert seconds to MM:SS or HH:MM:SS format
  static formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Extract keywords from transcript for search optimization
  static extractKeywords(transcript: string): string[] {
    if (!transcript) return []

    const words = transcript
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)

    // Simple frequency analysis
    const wordCount: { [key: string]: number } = {}
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1
    })

    // Return top keywords (appearing more than once)
    return Object.entries(wordCount)
      .filter(([word, count]) => count > 1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word)
  }

  // Search for specific terms in transcript with context
  static searchInTranscript(transcript: string, searchTerm: string, contextWords = 10): string[] {
    if (!transcript || !searchTerm) return []

    const words = transcript.split(/\s+/)
    const results: string[] = []
    const searchTermLower = searchTerm.toLowerCase()

    words.forEach((word, index) => {
      if (word.toLowerCase().includes(searchTermLower)) {
        const start = Math.max(0, index - contextWords)
        const end = Math.min(words.length, index + contextWords + 1)
        const context = words.slice(start, end).join(' ')
        results.push(context)
      }
    })

    return results
  }

  // Generate summary of transcript (simple version)
  static generateSummary(transcript: string, maxSentences = 3): string {
    if (!transcript) return ''

    const sentences = transcript
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20)

    if (sentences.length <= maxSentences) {
      return sentences.join('. ') + '.'
    }

    // Simple scoring: prefer sentences with common words
    const words = transcript.toLowerCase().split(/\s+/)
    const wordFreq: { [key: string]: number } = {}
    
    words.forEach(word => {
      if (word.length > 3) {
        wordFreq[word] = (wordFreq[word] || 0) + 1
      }
    })

    const scoredSentences = sentences.map(sentence => {
      const sentenceWords = sentence.toLowerCase().split(/\s+/)
      const score = sentenceWords.reduce((sum, word) => sum + (wordFreq[word] || 0), 0)
      return { sentence, score }
    })

    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSentences)
      .map(item => item.sentence)

    return topSentences.join('. ') + '.'
  }

  // Validate transcript quality
  static validateTranscript(transcript: string): {
    isValid: boolean
    issues: string[]
    confidence: number
  } {
    const issues: string[] = []
    let confidence = 1.0

    if (!transcript || transcript.trim().length === 0) {
      return { isValid: false, issues: ['Transcript is empty'], confidence: 0 }
    }

    // Check minimum length
    if (transcript.length < 50) {
      issues.push('Transcript appears too short')
      confidence -= 0.3
    }

    // Check for excessive repetition
    const words = transcript.toLowerCase().split(/\s+/)
    const uniqueWords = new Set(words)
    const repetitionRatio = words.length / uniqueWords.size

    if (repetitionRatio > 3) {
      issues.push('High word repetition detected')
      confidence -= 0.2
    }

    // Check for incomplete sentences
    const sentences = transcript.split(/[.!?]+/)
    const incompleteSentences = sentences.filter(s => s.trim().length < 5).length

    if (incompleteSentences > sentences.length * 0.3) {
      issues.push('Many incomplete sentences detected')
      confidence -= 0.2
    }

    // Check for common transcription errors
    const errorPatterns = [/\b(um|uh|er)\b/gi, /\[.*?\]/g, /\(\?\)/g]
    const errorCount = errorPatterns.reduce((count, pattern) => {
      return count + (transcript.match(pattern) || []).length
    }, 0)

    if (errorCount > words.length * 0.1) {
      issues.push('High number of transcription artifacts detected')
      confidence -= 0.1
    }

    return {
      isValid: issues.length === 0,
      issues,
      confidence: Math.max(0, Math.min(1, confidence))
    }
  }
}
