// lib/transcript-utils.ts
export class TranscriptUtils {
  // Format transcript with timestamps for better readability
  static formatWithTimestamps(segments: any[]): string {
    if (!segments || segments.length === 0) {
      return ''
    }

    return segments
      .map(segment => {
        const timestamp = this.formatTimestamp(segment.start)
        const speakerName = segment.speakerName ? `${segment.speakerName}: ` : ''
        return `[${timestamp}] ${speakerName}${segment.text}`
      })
      .join('\n\n')
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

    // Common stop words to exclude
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
      'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ])

    const words = transcript
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))

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
  static searchInTranscript(transcript: string, searchTerm: string, contextWords = 10): Array<{
    text: string
    position: number
  }> {
    if (!transcript || !searchTerm) return []

    const words = transcript.split(/\s+/)
    const results: Array<{ text: string; position: number }> = []
    const searchTermLower = searchTerm.toLowerCase()

    words.forEach((word, index) => {
      if (word.toLowerCase().includes(searchTermLower)) {
        const start = Math.max(0, index - contextWords)
        const end = Math.min(words.length, index + contextWords + 1)
        const context = words.slice(start, end).join(' ')
        results.push({
          text: context,
          position: index
        })
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
    stats: {
      length: number
      wordCount: number
      sentenceCount: number
      avgWordsPerSentence: number
    }
  } {
    const issues: string[] = []
    let confidence = 1.0

    if (!transcript || transcript.trim().length === 0) {
      return { 
        isValid: false, 
        issues: ['Transcript is empty'], 
        confidence: 0,
        stats: { length: 0, wordCount: 0, sentenceCount: 0, avgWordsPerSentence: 0 }
      }
    }

    // Calculate basic stats
    const length = transcript.length
    const words = transcript.trim().split(/\s+/)
    const wordCount = words.length
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const sentenceCount = sentences.length
    const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0

    // Check minimum length
    if (length < 50) {
      issues.push('Transcript appears too short')
      confidence -= 0.3
    }

    // Check for excessive repetition
    const uniqueWords = new Set(words.map(w => w.toLowerCase()))
    const repetitionRatio = wordCount / uniqueWords.size

    if (repetitionRatio > 3) {
      issues.push('High word repetition detected')
      confidence -= 0.2
    }

    // Check for incomplete sentences
    const incompleteSentences = sentences.filter(s => s.trim().length < 5).length

    if (incompleteSentences > sentenceCount * 0.3) {
      issues.push('Many incomplete sentences detected')
      confidence -= 0.2
    }

    // Check for common transcription errors
    const errorPatterns = [/\b(um|uh|er)\b/gi, /\[.*?\]/g, /\(\?\)/g, /\*.*?\*/g]
    const errorCount = errorPatterns.reduce((count, pattern) => {
      return count + (transcript.match(pattern) || []).length
    }, 0)

    if (errorCount > wordCount * 0.1) {
      issues.push('High number of transcription artifacts detected')
      confidence -= 0.1
    }

    // Check average sentence length
    if (avgWordsPerSentence < 3) {
      issues.push('Sentences appear too short on average')
      confidence -= 0.1
    } else if (avgWordsPerSentence > 50) {
      issues.push('Sentences appear too long on average')
      confidence -= 0.1
    }

    return {
      isValid: issues.length === 0,
      issues,
      confidence: Math.max(0, Math.min(1, confidence)),
      stats: {
        length,
        wordCount,
        sentenceCount,
        avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10
      }
    }
  }

  // Convert segments array to VTT format for video players
  static toVTTFormat(segments: any[]): string {
    if (!segments || segments.length === 0) {
      return 'WEBVTT\n\nNOTE\nNo transcript segments available\n'
    }

    let vtt = 'WEBVTT\n\n'
    
    segments.forEach((segment, index) => {
      const startTime = this.secondsToVTTTime(segment.start)
      const endTime = this.secondsToVTTTime(segment.end)
      
      vtt += `${index + 1}\n`
      vtt += `${startTime} --> ${endTime}\n`
      vtt += `${segment.text}\n\n`
    })

    return vtt
  }

  // Convert seconds to VTT time format (HH:MM:SS.mmm)
  private static secondsToVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    const wholeSeconds = Math.floor(secs)
    const milliseconds = Math.floor((secs - wholeSeconds) * 1000)

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${wholeSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
  }

  // Merge overlapping or consecutive segments
  static mergeSegments(segments: any[], maxGap = 1): any[] {
    if (!segments || segments.length === 0) return []

    const merged: any[] = []
    let current = { ...segments[0] }

    for (let i = 1; i < segments.length; i++) {
      const next = segments[i]
      
      // If there's a small gap or overlap, merge the segments
      if (next.start - current.end <= maxGap) {
        current.end = next.end
        current.text += ' ' + next.text
        if (current.confidence && next.confidence) {
          current.confidence = (current.confidence + next.confidence) / 2
        }
      } else {
        merged.push(current)
        current = { ...next }
      }
    }
    
    merged.push(current)
    return merged
  }

  // Split long segments for better readability
  static splitLongSegments(segments: any[], maxLength = 200): any[] {
    if (!segments || segments.length === 0) return []

    const result: any[] = []

    segments.forEach(segment => {
      if (segment.text.length <= maxLength) {
        result.push(segment)
        return
      }

      // Split by sentences first
      const sentences = segment.text.split(/[.!?]+/).filter(s => s.trim())
      if (sentences.length <= 1) {
        result.push(segment)
        return
      }

      const duration = segment.end - segment.start
      const avgDurationPerChar = duration / segment.text.length

      let currentText = ''
      let currentStart = segment.start

      sentences.forEach((sentence, index) => {
        const sentenceWithPunc = sentence.trim() + (index < sentences.length - 1 ? '.' : '')
        
        if (currentText.length + sentenceWithPunc.length <= maxLength) {
          currentText += (currentText ? ' ' : '') + sentenceWithPunc
        } else {
          if (currentText) {
            const segmentDuration = currentText.length * avgDurationPerChar
            result.push({
              ...segment,
              text: currentText,
              start: currentStart,
              end: currentStart + segmentDuration
            })
            currentStart += segmentDuration
          }
          currentText = sentenceWithPunc
        }
      })

      if (currentText) {
        result.push({
          ...segment,
          text: currentText,
          start: currentStart,
          end: segment.end
        })
      }
    })

    return result
  }
}