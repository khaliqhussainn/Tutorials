// lib/transcript-generator.ts
import OpenAI from 'openai'
import { prisma } from './prisma'

interface TranscriptSegment {
  start: number
  end: number
  text: string
  confidence?: number
}

interface TranscriptResponse {
  transcript: string
  segments: TranscriptSegment[]
  language: string
  confidence: number
  provider: string
}

export class TranscriptGenerator {
  private openai: OpenAI | null = null
  private provider: string

  constructor(provider: 'openai' = 'openai') {
    this.provider = provider
    
    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
    }
  }

  async generateTranscript(videoId: string, videoUrl: string): Promise<TranscriptResponse> {
    console.log(`🎬 Starting transcript generation for video: ${videoId}`)
    
    try {
      // Update status to processing
      await this.updateTranscriptStatus(videoId, 'PROCESSING')

      // Extract or prepare audio URL
      const audioUrl = await this.getAudioUrl(videoUrl)
      
      // Generate transcript based on provider
      let result: TranscriptResponse
      
      switch (this.provider) {
        case 'openai':
          result = await this.generateWithOpenAI(audioUrl)
          break
        default:
          throw new Error(`Provider ${this.provider} not supported`)
      }

      // Save successful result
      await this.saveTranscript(videoId, result)
      
      console.log(`✅ Transcript generated successfully for video: ${videoId}`)
      return result
      
    } catch (error) {
      console.error(`❌ Failed to generate transcript for video ${videoId}:`, error)
      
      // Save error status
      await this.updateTranscriptStatus(videoId, 'FAILED', error instanceof Error ? error.message : 'Unknown error')
      
      throw error
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

    } catch (error) {
      console.error('OpenAI transcription error:', error)
      throw new Error(`OpenAI transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async getAudioUrl(videoUrl: string): Promise<string> {
    // For Cloudinary videos, generate audio URL
    if (videoUrl.includes('cloudinary.com')) {
      try {
        // Extract public ID from video URL
        const urlParts = videoUrl.split('/')
        const filename = urlParts[urlParts.length - 1]
        const publicId = filename.replace(/\.[^/.]+$/, '') // Remove extension
        
        // Generate audio URL using Cloudinary transformation
        // You'll need to configure cloudinary properly
        const audioUrl = videoUrl.replace(/\.(mp4|mov|avi|mkv|webm)$/i, '.mp3')
        
        console.log(`🎵 Generated audio URL: ${audioUrl}`)
        return audioUrl
        
      } catch (error) {
        console.error('Failed to generate Cloudinary audio URL:', error)
        // Fallback to original video URL
        return videoUrl
      }
    }
    
    // For other video sources, return the original URL
    return videoUrl
  }

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

  private async saveTranscript(videoId: string, result: TranscriptResponse): Promise<void> {
    try {
      await prisma.transcript.upsert({
        where: { videoId },
        update: {
          content: result.transcript,
          language: result.language,
          segments: result.segments,
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
          segments: result.segments,
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

  // Static method to process all videos without transcripts
  static async generateTranscriptsForAllVideos(): Promise<void> {
    console.log('🚀 Starting bulk transcript generation...')
    
    try {
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

      const generator = new TranscriptGenerator('openai')

      for (const video of videos) {
        try {
          console.log(`Processing: ${video.title}`)
          await generator.generateTranscript(video.id, video.videoUrl)
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000))
          
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