// lib/transcript-generator.ts - Fixed version
import OpenAI from 'openai'
import { prisma } from './prisma'

interface TranscriptSegment {
  start: number
  end: number
  text: string
  confidence?: number
  speaker?: string
}

interface TranscriptResponse {
  transcript: string
  segments: TranscriptSegment[]
  language: string
  confidence: number
  provider: string
}

type Provider = 'openai' | 'assemblyai'

export class TranscriptGenerator {
  private openai: OpenAI | null = null
  private provider: Provider
  private assemblyApiKey: string | null = null

  constructor(provider: Provider = 'assemblyai') {
    this.provider = provider
    
    // Initialize OpenAI if available and requested
    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
    }
    
    // Initialize AssemblyAI
    if (provider === 'assemblyai' && process.env.ASSEMBLYAI_API_KEY) {
      this.assemblyApiKey = process.env.ASSEMBLYAI_API_KEY
    }
  }

  async generateTranscript(videoId: string, videoUrl: string): Promise<TranscriptResponse> {
    console.log(`🎬 Starting transcript generation for video: ${videoId} using ${this.provider}`)
    
    try {
      // Update status to processing - Fixed: Use uppercase enum
      await this.updateTranscriptStatus(videoId, 'PROCESSING')

      // Generate transcript based on provider
      let result: TranscriptResponse
      
      switch (this.provider) {
        case 'assemblyai':
          result = await this.generateWithAssemblyAI(videoUrl)
          break
        case 'openai':
          result = await this.generateWithOpenAI(videoUrl)
          break
        default:
          throw new Error(`Provider ${this.provider} not supported`)
      }

      // Save successful result - Fixed: Pass segments as JSON-compatible data
      await this.saveTranscript(videoId, result)
      
      console.log(`✅ Transcript generated successfully for video: ${videoId}`)
      return result
      
    } catch (error) {
      console.error(`❌ Failed to generate transcript for video ${videoId}:`, error)
      
      // Save error status - Fixed: Use uppercase enum
      await this.updateTranscriptStatus(
        videoId, 
        'FAILED', 
        error instanceof Error ? error.message : 'Unknown error'
      )
      
      throw error
    }
  }

  private async generateWithAssemblyAI(audioUrl: string): Promise<TranscriptResponse> {
    if (!this.assemblyApiKey) {
      throw new Error('AssemblyAI API key not configured')
    }

    console.log('🤖 Using AssemblyAI for transcription')

    try {
      // Step 1: Upload audio file to AssemblyAI
      console.log('📤 Uploading audio to AssemblyAI...')
      const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          'Authorization': this.assemblyApiKey,
        },
        body: await this.fetchAudioAsBuffer(audioUrl)
      })

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`)
      }

      const { upload_url } = await uploadResponse.json()
      console.log('✅ Audio uploaded successfully')

      // Step 2: Request transcription
      console.log('🎯 Requesting transcription...')
      const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'Authorization': this.assemblyApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: upload_url,
          speaker_labels: true,
          auto_chapters: false,
          auto_highlights: false,
          sentiment_analysis: false,
          entity_detection: false,
          iab_categories: false,
          language_detection: true,
          punctuate: true,
          format_text: true,
          dual_channel: false,
        }),
      })

      if (!transcriptResponse.ok) {
        throw new Error(`Transcription request failed: ${transcriptResponse.statusText}`)
      }

      const transcriptData = await transcriptResponse.json()
      const transcriptId = transcriptData.id

      // Step 3: Poll for completion
      console.log('⏳ Waiting for transcription to complete...')
      let transcript = null
      let attempts = 0
      const maxAttempts = 120 // 10 minutes max (5s intervals)

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        
        const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
          headers: {
            'Authorization': this.assemblyApiKey,
          },
        })
        
        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.statusText}`)
        }
        
        transcript = await statusResponse.json()
        
        console.log(`📊 Transcription status: ${transcript.status} (attempt ${attempts + 1}/${maxAttempts})`)
        
        if (transcript.status === 'completed') {
          break
        } else if (transcript.status === 'error') {
          throw new Error(`Transcription failed: ${transcript.error}`)
        }
        
        attempts++
      }

      if (!transcript || transcript.status !== 'completed') {
        throw new Error('Transcription timed out')
      }

      // Step 4: Process segments - Fixed: Better segment processing
      const segments: TranscriptSegment[] = []
      
      if (transcript.utterances && transcript.utterances.length > 0) {
        // Use utterances for speaker-separated segments
        transcript.utterances.forEach((utterance: any) => {
          segments.push({
            start: utterance.start / 1000, // Convert ms to seconds
            end: utterance.end / 1000,
            text: utterance.text,
            confidence: utterance.confidence,
            speaker: utterance.speaker ? `Speaker ${utterance.speaker}` : undefined
          })
        })
      } else if (transcript.words && transcript.words.length > 0) {
        // Fallback: Group words into segments
        segments.push(...this.groupWordsIntoSentences(transcript.words.map((word: any) => ({
          start: word.start / 1000,
          end: word.end / 1000,
          text: word.text,
          confidence: word.confidence
        }))))
      }

      console.log(`✅ Transcription completed with ${segments.length} segments`)

      return {
        transcript: transcript.text || '',
        segments,
        language: transcript.language_code || 'en',
        confidence: transcript.confidence || 0.95,
        provider: 'assemblyai'
      }

    } catch (error) {
      console.error('AssemblyAI transcription error:', error)
      throw new Error(`AssemblyAI transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async generateWithOpenAI(audioUrl: string): Promise<TranscriptResponse> {
    if (!this.openai) {
      throw new Error('OpenAI not configured')
    }

    console.log('🤖 Using OpenAI Whisper for transcription')

    try {
      // Download audio file
      const audioResponse = await fetch(audioUrl)
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.statusText}`)
      }

      const audioBuffer = await audioResponse.arrayBuffer()
      const audioFile = new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' })

      // Check file size (OpenAI limit is 25MB)
      const maxSize = 25 * 1024 * 1024 // 25MB
      if (audioFile.size > maxSize) {
        throw new Error(`Audio file too large: ${(audioFile.size / 1024 / 1024).toFixed(1)}MB (max 25MB)`)
      }

      console.log(`🎵 Audio file size: ${(audioFile.size / 1024 / 1024).toFixed(1)}MB`)

      // Create transcription
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment']
      })

      // Process the response
      const segments: TranscriptSegment[] = (transcription.segments || []).map((segment: any) => ({
        start: segment.start,
        end: segment.end,
        text: segment.text.trim(),
        confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : undefined
      }))

      return {
        transcript: transcription.text,
        segments,
        language: transcription.language || 'en',
        confidence: 0.9,
        provider: 'openai'
      }

    } catch (error: any) {
      console.error('OpenAI transcription error:', error)
      
      // Enhanced error handling
      if (error.status === 429 || error.code === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. Please check your billing and usage limits.')
      } else if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your configuration.')
      } else if (error.status === 413) {
        throw new Error('Audio file too large for OpenAI API (max 25MB).')
      }
      
      throw new Error(`OpenAI transcription failed: ${error.message || 'Unknown error'}`)
    }
  }

  private async fetchAudioAsBuffer(audioUrl: string): Promise<ArrayBuffer> {
    const response = await fetch(audioUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`)
    }
    return response.arrayBuffer()
  }

  private groupWordsIntoSentences(words: TranscriptSegment[]): TranscriptSegment[] {
    if (words.length === 0) return []

    const sentences: TranscriptSegment[] = []
    let currentSentence: TranscriptSegment = {
      start: words[0].start,
      end: words[0].end,
      text: words[0].text,
      confidence: words[0].confidence,
      speaker: words[0].speaker
    }

    for (let i = 1; i < words.length; i++) {
      const word = words[i]
      const prevWord = words[i - 1]

      // Check if this should start a new sentence
      const shouldStartNewSentence = 
        word.start - prevWord.end > 2 || // Long pause
        prevWord.text.match(/[.!?]$/) || // Previous word ends with punctuation
        (word.speaker && word.speaker !== currentSentence.speaker) || // Speaker change
        currentSentence.text.split(' ').length >= 20 // Max words per segment

      if (shouldStartNewSentence) {
        sentences.push(currentSentence)
        currentSentence = {
          start: word.start,
          end: word.end,
          text: word.text,
          confidence: word.confidence,
          speaker: word.speaker
        }
      } else {
        // Add to current sentence
        currentSentence.end = word.end
        currentSentence.text += ' ' + word.text
        // Average confidence
        if (currentSentence.confidence && word.confidence) {
          currentSentence.confidence = (currentSentence.confidence + word.confidence) / 2
        }
      }
    }

    // Add the last sentence
    sentences.push(currentSentence)

    return sentences
  }

  // Fixed: Use uppercase enum values
  private async updateTranscriptStatus(
    videoId: string, 
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
    error?: string
  ): Promise<void> {
    try {
      await prisma.transcript.upsert({
        where: { videoId },
        update: { 
          status, 
          error: error || null,
          updatedAt: new Date()
        },
        create: {
          videoId,
          content: '',
          status,
          error: error || null
        }
      })
    } catch (dbError) {
      console.error('Failed to update transcript status:', dbError)
    }
  }

  // Fixed: Properly handle JSON segments
  private async saveTranscript(videoId: string, result: TranscriptResponse): Promise<void> {
    try {
      await prisma.transcript.upsert({
        where: { videoId },
        update: {
          content: result.transcript,
          language: result.language,
          segments: result.segments as any, // Cast to any to satisfy Prisma JSON type
          status: 'COMPLETED',
          confidence: result.confidence,
          provider: result.provider,
          generatedAt: new Date(),
          error: null
        },
        create: {
          videoId,
          content: result.transcript,
          language: result.language,
          segments: result.segments as any, // Cast to any to satisfy Prisma JSON type
          status: 'COMPLETED',
          confidence: result.confidence,
          provider: result.provider,
          generatedAt: new Date()
        }
      })

      console.log(`💾 Transcript saved successfully for video: ${videoId}`)
    } catch (error) {
      console.error('Failed to save transcript:', error)
      throw error
    }
  }

  // Auto-detect best provider
  static getBestProvider(): Provider {
    if (process.env.ASSEMBLYAI_API_KEY) {
      return 'assemblyai'
    } else if (process.env.OPENAI_API_KEY) {
      return 'openai'
    }
    throw new Error('No transcript provider configured')
  }

  // Static method for bulk processing
  static async generateTranscriptsForAllVideos(): Promise<void> {
    console.log('🚀 Starting bulk transcript generation...')
    
    try {
      const provider = TranscriptGenerator.getBestProvider()
      console.log(`Using provider: ${provider}`)
      
      const videos = await prisma.video.findMany({
        where: {
          AND: [
            { videoUrl: { not: null } },
            {
              OR: [
                { transcript: null },
                { transcript: { status: { in: ['PENDING', 'FAILED'] } } }
              ]
            }
          ]
        },
        select: {
          id: true,
          title: true,
          videoUrl: true,
          transcript: {
            select: { status: true }
          }
        },
        take: 50
      })

      console.log(`📹 Found ${videos.length} videos needing transcripts`)

      const generator = new TranscriptGenerator(provider)

      for (const video of videos) {
        try {
          console.log(`Processing: ${video.title}`)
          await generator.generateTranscript(video.id, video.videoUrl)
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 3000))
          
        } catch (error) {
          console.error(`Failed to process video ${video.title}:`, error)
          // Continue with next video
        }
      }

      console.log('✅ Bulk transcript generation completed')
    } catch (error) {
      console.error('Bulk transcript generation failed:', error)
      throw error
    }
  }
}