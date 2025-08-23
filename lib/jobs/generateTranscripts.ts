// lib/jobs/generateTranscripts.ts - Final Fixed version with proper JSON handling
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface TranscriptJob {
  videoId: string
  videoUrl: string
  priority: 'high' | 'medium' | 'low'
}

interface TranscriptSegment {
  start: number
  end: number
  text: string
  confidence?: number
  speaker?: string
}

export class TranscriptGenerator {
  private static instance: TranscriptGenerator
  private jobQueue: TranscriptJob[] = []
  private isProcessing = false
  private maxConcurrent = 3 // Adjust based on your API limits

  static getInstance(): TranscriptGenerator {
    if (!TranscriptGenerator.instance) {
      TranscriptGenerator.instance = new TranscriptGenerator()
    }
    return TranscriptGenerator.instance
  }

  async queueVideo(videoId: string, videoUrl: string, priority: 'high' | 'medium' | 'low' = 'medium') {
    // Check if transcript already exists
    const existingTranscript = await prisma.transcript.findUnique({
      where: { videoId }
    })

    if (existingTranscript && existingTranscript.status === 'COMPLETED') {
      console.log(`Transcript already exists for video ${videoId}`)
      return
    }

    // Add to queue
    this.jobQueue.push({ videoId, videoUrl, priority })
    
    // Sort by priority
    this.jobQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue()
    }
  }

  private async processQueue() {
    if (this.jobQueue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const currentJobs: Promise<void>[] = []

    // Process up to maxConcurrent jobs simultaneously
    for (let i = 0; i < Math.min(this.maxConcurrent, this.jobQueue.length); i++) {
      const job = this.jobQueue.shift()
      if (job) {
        currentJobs.push(this.processJob(job))
      }
    }

    // Wait for current batch to complete
    await Promise.allSettled(currentJobs)

    // Continue with next batch
    setTimeout(() => this.processQueue(), 1000) // Small delay between batches
  }

  private async processJob(job: TranscriptJob) {
    try {
      console.log(`Starting transcript generation for video ${job.videoId}`)
      
      // Mark as processing - Fixed: Use uppercase enum values
      await prisma.transcript.upsert({
        where: { videoId: job.videoId },
        update: { status: 'PROCESSING' },
        create: {
          videoId: job.videoId,
          content: '',
          status: 'PROCESSING'
        }
      })

      // Generate transcript using AssemblyAI
      const result = await this.generateTranscript(job.videoUrl, job.videoId)

      if (result) {
        // Save transcript to database - Fixed: Save as JSON
        await this.saveTranscript(job.videoId, result.segments, result.language, result.content)
        console.log(`Transcript completed for video ${job.videoId}`)
      } else {
        // Mark as failed - Fixed: Use uppercase enum value
        await prisma.transcript.update({
          where: { videoId: job.videoId },
          data: { status: 'FAILED' }
        })
        console.error(`Transcript generation failed for video ${job.videoId}`)
      }

    } catch (error) {
      console.error(`Error processing transcript job for video ${job.videoId}:`, error)
      
      // Mark as failed - Fixed: Use uppercase enum value
      await prisma.transcript.update({
        where: { videoId: job.videoId },
        data: { status: 'FAILED', error: error instanceof Error ? error.message : 'Unknown error' }
      }).catch(console.error)
    }
  }

  private async generateTranscript(videoUrl: string, videoId: string) {
    try {
      // Submit to AssemblyAI
      const response = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.ASSEMBLYAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audio_url: videoUrl,
          auto_chapters: false,
          speaker_labels: true,
          language_detection: true,
          punctuate: true,
          format_text: true
        })
      })

      if (!response.ok) {
        throw new Error(`AssemblyAI API error: ${response.status} ${response.statusText}`)
      }

      const transcriptRequest = await response.json()
      
      if (!transcriptRequest.id) {
        throw new Error('Failed to submit transcript request')
      }

      // Poll for completion
      let transcript = null
      let attempts = 0
      const maxAttempts = 120 // 10 minutes max

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        
        const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptRequest.id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.ASSEMBLYAI_API_KEY}`
          }
        })

        if (!statusResponse.ok) {
          throw new Error(`AssemblyAI status check error: ${statusResponse.status}`)
        }
        
        transcript = await statusResponse.json()
        
        console.log(`Transcript status: ${transcript.status} (attempt ${attempts + 1}/${maxAttempts})`)
        
        if (transcript.status === 'completed') {
          break
        } else if (transcript.status === 'error') {
          throw new Error(`Transcript generation failed: ${transcript.error}`)
        }
        
        attempts++
      }

      if (!transcript || transcript.status !== 'completed') {
        throw new Error('Transcript generation timed out')
      }

      // Convert to our format - Fixed: Proper segment format
      const segments: TranscriptSegment[] = []
      
      if (transcript.utterances && transcript.utterances.length > 0) {
        // Use utterances (speaker-separated segments)
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
        // Fallback: group words into sentences
        let currentSegment: TranscriptSegment | null = null
        const maxWordsPerSegment = 15
        let wordCount = 0

        transcript.words.forEach((word: any, index: number) => {
          if (!currentSegment || wordCount >= maxWordsPerSegment) {
            if (currentSegment) {
              segments.push(currentSegment)
            }
            currentSegment = {
              start: word.start / 1000,
              end: word.end / 1000,
              text: word.text,
              confidence: word.confidence
            }
            wordCount = 1
          } else {
            currentSegment.end = word.end / 1000
            currentSegment.text += ' ' + word.text
            currentSegment.confidence = (currentSegment.confidence! + word.confidence) / 2
            wordCount++
          }
        })

        if (currentSegment) {
          segments.push(currentSegment)
        }
      }

      return {
        segments,
        language: transcript.language_code || 'en',
        content: transcript.text || ''
      }

    } catch (error) {
      console.error('Error generating transcript:', error)
      return null
    }
  }

  // Fixed: Save transcript as JSON with proper Prisma types
  private async saveTranscript(videoId: string, segments: TranscriptSegment[], language: string, content: string) {
    try {
      // Convert segments to proper JSON format for Prisma
      const segmentsJson = segments.map(segment => ({
        start: segment.start,
        end: segment.end,
        text: segment.text,
        confidence: segment.confidence || null,
        speaker: segment.speaker || null
      }))

      // Update transcript with all data - Fixed: Proper JSON handling
      await prisma.transcript.update({
        where: { videoId },
        data: {
          content: content,
          language: language,
          segments: segmentsJson as Prisma.JsonArray, // Proper Prisma JSON type
          status: 'COMPLETED',
          generatedAt: new Date(),
          provider: 'assemblyai',
          confidence: segments.length > 0 ? 
            segments.reduce((acc, seg) => acc + (seg.confidence || 0), 0) / segments.length : 
            null
        }
      })

      console.log(`✅ Transcript saved successfully for video: ${videoId} (${segments.length} segments)`)

    } catch (error) {
      console.error('Error saving transcript to database:', error)
      throw error
    }
  }

  // Method to generate transcripts for all videos without transcripts
  async generateAllMissingTranscripts() {
    try {
      const videosWithoutTranscripts = await prisma.video.findMany({
        where: {
          transcript: null,
          videoUrl: {
            not: null
          }
        },
        select: {
          id: true,
          videoUrl: true,
          title: true
        }
      })

      console.log(`Found ${videosWithoutTranscripts.length} videos without transcripts`)

      for (const video of videosWithoutTranscripts) {
        if (video.videoUrl) {
          await this.queueVideo(video.id, video.videoUrl, 'low')
        }
      }

    } catch (error) {
      console.error('Error queuing missing transcripts:', error)
    }
  }

  // Method to retry failed transcripts
  async retryFailedTranscripts() {
    try {
      const failedTranscripts = await prisma.transcript.findMany({
        where: {
          status: 'FAILED'
        },
        include: {
          video: {
            select: {
              id: true,
              videoUrl: true,
              title: true
            }
          }
        }
      })

      console.log(`Found ${failedTranscripts.length} failed transcripts to retry`)

      for (const transcript of failedTranscripts) {
        if (transcript.video.videoUrl) {
          await this.queueVideo(transcript.video.id, transcript.video.videoUrl, 'medium')
        }
      }

    } catch (error) {
      console.error('Error retrying failed transcripts:', error)
    }
  }
}

// API route to trigger transcript generation: app/api/admin/generate-transcripts/route.ts
export async function POST() {
  try {
    const generator = TranscriptGenerator.getInstance()
    await generator.generateAllMissingTranscripts()
    
    return Response.json({ 
      success: true, 
      message: 'Transcript generation jobs queued' 
    })
  } catch (error) {
    console.error('Error starting transcript generation:', error)
    return Response.json(
      { error: 'Failed to start transcript generation' },
      { status: 500 }
    )
  }
}

// Hook to automatically generate transcripts when videos are uploaded
export async function onVideoUpload(videoId: string, videoUrl: string) {
  const generator = TranscriptGenerator.getInstance()
  await generator.queueVideo(videoId, videoUrl, 'high')
}