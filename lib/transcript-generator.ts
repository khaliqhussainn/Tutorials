// lib/transcript-generator.ts - Video Transcript Generation Service
import { prisma } from './prisma'

// Types for transcript segments
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
}

// Service configuration
const SUPPORTED_PROVIDERS = {
  OPENAI_WHISPER: 'openai',
  GOOGLE_SPEECH: 'google',
  ASSEMBLY_AI: 'assemblyai'
} as const

type TranscriptProvider = typeof SUPPORTED_PROVIDERS[keyof typeof SUPPORTED_PROVIDERS]

class TranscriptGenerator {
  private provider: TranscriptProvider
  private apiKey: string

  constructor(provider: TranscriptProvider = 'openai') {
    this.provider = provider
    this.apiKey = this.getApiKey(provider)
  }

  private getApiKey(provider: TranscriptProvider): string {
    switch (provider) {
      case 'openai':
        return process.env.OPENAI_API_KEY || ''
      case 'google':
        return process.env.GOOGLE_CLOUD_API_KEY || ''
      case 'assemblyai':
        return process.env.ASSEMBLYAI_API_KEY || ''
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }

  // Main method to generate transcript from video URL
  async generateTranscript(videoUrl: string, videoId: string): Promise<TranscriptResponse> {
    console.log(`🎬 Generating transcript for video: ${videoId}`)
    
    try {
      // Extract audio from video
      const audioUrl = await this.extractAudioFromVideo(videoUrl)
      
      // Generate transcript based on provider
      let transcript: TranscriptResponse
      
      switch (this.provider) {
        case 'openai':
          transcript = await this.generateWithOpenAI(audioUrl)
          break
        case 'google':
          transcript = await this.generateWithGoogle(audioUrl)
          break
        case 'assemblyai':
          transcript = await this.generateWithAssemblyAI(audioUrl)
          break
        default:
          throw new Error(`Provider ${this.provider} not implemented`)
      }

      // Save transcript to database
      await this.saveTranscript(videoId, transcript)
      
      console.log(`✅ Transcript generated successfully for video: ${videoId}`)
      return transcript
      
    } catch (error) {
      console.error(`❌ Failed to generate transcript for video ${videoId}:`, error)
      throw error
    }
  }

  // OpenAI Whisper implementation
  private async generateWithOpenAI(audioUrl: string): Promise<TranscriptResponse> {
    const formData = new FormData()
    
    // Download audio file
    const audioResponse = await fetch(audioUrl)
    const audioBlob = await audioResponse.blob()
    
    formData.append('file', audioBlob, 'audio.mp3')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities[]', 'segment')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const result = await response.json()
    
    return {
      transcript: result.text,
      segments: result.segments?.map((seg: any) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
        confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : undefined
      })) || [],
      language: result.language || 'en',
      confidence: 0.9 // OpenAI doesn't provide overall confidence
    }
  }

  // Google Speech-to-Text implementation
  private async generateWithGoogle(audioUrl: string): Promise<TranscriptResponse> {
    // Note: This requires Google Cloud Speech-to-Text API
    const audioResponse = await fetch(audioUrl)
    const audioBuffer = await audioResponse.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString('base64')

    const requestBody = {
      config: {
        encoding: 'MP3',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
        enableWordTimeOffsets: true,
        enableWordConfidence: true,
        enableAutomaticPunctuation: true,
        model: 'latest_long'
      },
      audio: {
        content: audioBase64
      }
    }

    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    )

    if (!response.ok) {
      throw new Error(`Google Speech API error: ${response.statusText}`)
    }

    const result = await response.json()
    const alternatives = result.results?.[0]?.alternatives?.[0]
    
    if (!alternatives) {
      throw new Error('No transcript alternatives found')
    }

    const segments: TranscriptSegment[] = alternatives.words?.map((word: any) => ({
      start: parseFloat(word.startTime?.replace('s', '') || '0'),
      end: parseFloat(word.endTime?.replace('s', '') || '0'),
      text: word.word,
      confidence: word.confidence
    })) || []

    return {
      transcript: alternatives.transcript,
      segments,
      language: 'en',
      confidence: alternatives.confidence || 0.8
    }
  }

  // AssemblyAI implementation (recommended for better accuracy)
  private async generateWithAssemblyAI(audioUrl: string): Promise<TranscriptResponse> {
    // Step 1: Upload audio file
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': this.apiKey,
        'content-type': 'application/octet-stream'
      },
      body: await fetch(audioUrl).then(r => r.blob())
    })

    const { upload_url } = await uploadResponse.json()

    // Step 2: Request transcription
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': this.apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: upload_url,
        speaker_labels: true,
        punctuate: true,
        format_text: true,
        language_detection: true
      })
    })

    const { id } = await transcriptResponse.json()

    // Step 3: Poll for completion
    let transcript: any
    do {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: { 'authorization': this.apiKey }
      })
      
      transcript = await pollResponse.json()
    } while (transcript.status === 'processing' || transcript.status === 'queued')

    if (transcript.status === 'error') {
      throw new Error(`AssemblyAI error: ${transcript.error}`)
    }

    const segments: TranscriptSegment[] = transcript.words?.map((word: any) => ({
      start: word.start / 1000, // Convert ms to seconds
      end: word.end / 1000,
      text: word.text,
      confidence: word.confidence
    })) || []

    return {
      transcript: transcript.text,
      segments,
      language: transcript.language_code || 'en',
      confidence: transcript.confidence || 0.8
    }
  }

  // Extract audio from video using Cloudinary or external service
  private async extractAudioFromVideo(videoUrl: string): Promise<string> {
    // For Cloudinary videos, we can use their audio extraction
    if (videoUrl.includes('cloudinary.com')) {
      // Extract public ID from Cloudinary URL
      const publicIdMatch = videoUrl.match(/\/v\d+\/(.+)\.(mp4|mov|avi|mkv|webm)/)
      if (publicIdMatch) {
        const publicId = publicIdMatch[1]
        // Generate audio URL using Cloudinary transformation
        return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/f_mp3,q_auto/${publicId}.mp3`
      }
    }

    // For other video URLs, you might need to use a service like FFmpeg
    // For now, we'll assume the video URL can be used directly
    return videoUrl
  }

private async saveTranscript(videoId: string, transcript: TranscriptResponse): Promise<void> {
  try {
    await prisma.transcript.upsert({
      where: { videoId },
      update: {
        content: transcript.transcript,
        language: transcript.language,
        segments: transcript.segments ? JSON.stringify(transcript.segments) : undefined,
        status: 'COMPLETED',
        generatedAt: new Date()
      },
      create: {
        videoId,
        content: transcript.transcript,
        language: transcript.language,
        segments: transcript.segments ? JSON.stringify(transcript.segments) : undefined,
        status: 'COMPLETED',
        generatedAt: new Date()
      }
    })

    console.log(`💾 Transcript saved to database for video: ${videoId}`)
  } catch (error) {
    console.error('Failed to save transcript to database:', error)
    throw error
  }
}



  // Process transcript for search and accessibility
  static formatTranscriptForDisplay(transcript: string, segments?: TranscriptSegment[]): string {
    if (!segments || segments.length === 0) {
      return transcript
    }

    // Format with timestamps every 30 seconds
    const formattedSegments: string[] = []
    let currentTime = 0
    let currentText = ''

    for (const segment of segments) {
      if (segment.start >= currentTime + 30) {
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

  private static formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Generate transcript for existing videos in database
  static async generateTranscriptsForAllVideos(): Promise<void> {
    console.log('🚀 Starting bulk transcript generation...')
    
    const videos = await prisma.video.findMany({
      where: {
        transcript: null,
        videoUrl: { not: null }
      },
      select: {
        id: true,
        title: true,
        videoUrl: true
      }
    })

    console.log(`📹 Found ${videos.length} videos without transcripts`)

    const generator = new TranscriptGenerator('openai') // or your preferred provider

    for (const video of videos) {
      try {
        console.log(`Processing: ${video.title}`)
        await generator.generateTranscript(video.videoUrl, video.id)
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.error(`Failed to process video ${video.title}:`, error)
      }
    }

    console.log('✅ Bulk transcript generation completed')
  }
}

export { TranscriptGenerator, type TranscriptResponse, type TranscriptSegment }