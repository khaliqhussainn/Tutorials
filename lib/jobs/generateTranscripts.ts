// lib/jobs/generateTranscripts.ts
import { prisma } from '@/lib/prisma'

interface TranscriptJob {
  videoId: string
  videoUrl: string
  priority: 'high' | 'medium' | 'low'
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

    if (existingTranscript && existingTranscript.status === 'completed') {
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
      
      // Mark as processing
      await prisma.transcript.upsert({
        where: { videoId: job.videoId },
        update: { status: 'processing' },
        create: {
          videoId: job.videoId,
          status: 'processing'
        }
      })

      // Generate transcript using AssemblyAI
      const result = await this.generateTranscript(job.videoUrl, job.videoId)

      if (result) {
        // Save segments to database
        await this.saveTranscript(job.videoId, result.segments, result.language)
        console.log(`Transcript completed for video ${job.videoId}`)
      } else {
        // Mark as failed
        await prisma.transcript.update({
          where: { videoId: job.videoId },
          data: { status: 'failed' }
        })
        console.error(`Transcript generation failed for video ${job.videoId}`)
      }

    } catch (error) {
      console.error(`Error processing transcript job for video ${job.videoId}:`, error)
      
      // Mark as failed
      await prisma.transcript.update({
        where: { videoId: job.videoId },
        data: { status: 'failed' }
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
        
        transcript = await statusResponse.json()
        
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

      // Convert to our format
      const segments = transcript.utterances?.map((utterance: any, index: number) => ({
        id: `${videoId}-${index}`,
        startTime: utterance.start / 1000, // Convert ms to seconds
        endTime: utterance.end / 1000,
        text: utterance.text,
        speakerName: `Speaker ${utterance.speaker}`,
        confidence: utterance.confidence
      })) || []

      return {
        segments,
        language: transcript.language_code || 'en'
      }

    } catch (error) {
      console.error('Error generating transcript:', error)
      return null
    }
  }

  private async saveTranscript(videoId: string, segments: any[], language: string) {
    try {
      // Update transcript status and language
      const transcript = await prisma.transcript.update({
        where: { videoId },
        data: {
          status: 'completed',
          language
        }
      })

      // Create transcript segments
      if (segments.length > 0) {
        await prisma.transcriptSegment.createMany({
          data: segments.map(segment => ({
            transcriptId: transcript.id,
            startTime: segment.startTime,
            endTime: segment.endTime,
            text: segment.text,
            speakerName: segment.speakerName,
            confidence: segment.confidence
          }))
        })
      }

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