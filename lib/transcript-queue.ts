// lib/transcript-queue.ts - Enhanced queue system for background transcript processing
import { PrismaClient } from '@prisma/client'
import { TranscriptGenerator } from './transcript-generator'

const prisma = new PrismaClient()

interface TranscriptJob {
  id: string
  videoId: string
  videoUrl: string
  priority: number
  createdAt: Date
  attempts: number
  maxAttempts: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
  estimatedDuration?: number
}

export class TranscriptQueue {
  private static instance: TranscriptQueue
  private processing = false
  private jobs: TranscriptJob[] = []
  private currentJob: TranscriptJob | null = null

  static getInstance(): TranscriptQueue {
    if (!TranscriptQueue.instance) {
      TranscriptQueue.instance = new TranscriptQueue()
    }
    return TranscriptQueue.instance
  }

  // Add a video to the transcript generation queue
  async addJob(videoId: string, videoUrl: string, priority = 0): Promise<void> {
    // Check if job already exists
    const existingJob = this.jobs.find(j => j.videoId === videoId)
    if (existingJob) {
      console.log(`📝 Job for video ${videoId} already exists with status: ${existingJob.status}`)
      return
    }

    // Check if video already has transcript
    try {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { transcript: true, duration: true }
      })

      if (video?.transcript) {
        console.log(`📝 Video ${videoId} already has a transcript, skipping`)
        return
      }
    } catch (error) {
      console.warn(`Failed to check existing transcript for video ${videoId}:`, error)
    }

    const job: TranscriptJob = {
      id: `transcript-${videoId}-${Date.now()}`,
      videoId,
      videoUrl,
      priority,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: 3,
      status: 'pending',
      estimatedDuration: 0 // Will be calculated based on video duration
    }

    this.jobs.push(job)
    this.jobs.sort((a, b) => b.priority - a.priority) // Higher priority first

    console.log(`📝 Added transcript job for video ${videoId} (priority: ${priority})`)

    if (!this.processing) {
      // Start processing in background
      this.processQueue().catch(error => {
        console.error('Queue processing error:', error)
      })
    }
  }

  // Process the queue
  private async processQueue(): Promise<void> {
    if (this.processing || this.jobs.length === 0) return

    this.processing = true
    console.log(`🔄 Starting to process ${this.jobs.length} transcript jobs`)

    while (this.jobs.length > 0) {
      const job = this.jobs.find(j => j.status === 'pending')
      if (!job) break

      this.currentJob = job

      try {
        job.status = 'processing'
        job.attempts++

        console.log(`📹 Processing transcript for video ${job.videoId} (attempt ${job.attempts}/${job.maxAttempts})`)

        // Update database to show processing status
        await this.updateVideoTranscriptStatus(job.videoId, 'processing')

        const generator = new TranscriptGenerator()
        const startTime = Date.now()
        
        const result = await generator.generateTranscript(job.videoUrl, job.videoId)
        
        const processingTime = (Date.now() - startTime) / 1000
        console.log(`✅ Transcript completed for video ${job.videoId} in ${processingTime.toFixed(1)}s`)
        console.log(`📊 Generated ${result.transcript.length} characters with ${Math.round((result.confidence || 0) * 100)}% confidence`)

        job.status = 'completed'

        // Update database with success status
        await this.updateVideoTranscriptStatus(job.videoId, 'completed', {
          transcript: result.transcript,
          confidence: result.confidence,
          language: result.language,
          processingTime
        })

        // Remove completed job
        this.jobs = this.jobs.filter(j => j.id !== job.id)

        // Add delay between jobs to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error: any) {
        console.error(`❌ Transcript failed for video ${job.videoId}:`, error.message)

        if (job.attempts >= job.maxAttempts) {
          job.status = 'failed'
          job.error = error.message
          
          // Update database with failed status
          await this.updateVideoTranscriptStatus(job.videoId, 'failed', { error: error.message })
          
          // Remove failed job after max attempts
          this.jobs = this.jobs.filter(j => j.id !== job.id)
          console.log(`💀 Transcript job failed permanently for video ${job.videoId}`)
        } else {
          job.status = 'pending'
          console.log(`🔄 Retrying transcript for video ${job.videoId} (${job.maxAttempts - job.attempts} attempts left)`)
          
          // Add exponential backoff delay
          const delay = Math.pow(2, job.attempts) * 5000 // 5s, 10s, 20s
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    this.currentJob = null
    this.processing = false
    console.log('✅ Transcript queue processing completed')
  }

  // Update video transcript status in database
  private async updateVideoTranscriptStatus(
    videoId: string, 
    status: 'processing' | 'completed' | 'failed',
    data?: any
  ): Promise<void> {
    try {
      const updateData: any = {}

      switch (status) {
        case 'processing':
          // We could add a processing status field if needed
          break
        case 'completed':
          if (data?.transcript) {
            updateData.transcript = data.transcript
          }
          break
        case 'failed':
          // Could add an error log field if needed
          console.error(`Failed to generate transcript for video ${videoId}:`, data?.error)
          break
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.video.update({
          where: { id: videoId },
          data: updateData
        })
      }
    } catch (error) {
      console.error(`Failed to update video transcript status for ${videoId}:`, error)
    }
  }

  // Get queue status
  getStatus(): { 
    pending: number
    processing: number
    completed: number
    failed: number
    total: number
    currentJob?: string
  } {
    return {
      pending: this.jobs.filter(j => j.status === 'pending').length,
      processing: this.jobs.filter(j => j.status === 'processing').length,
      completed: this.jobs.filter(j => j.status === 'completed').length,
      failed: this.jobs.filter(j => j.status === 'failed').length,
      total: this.jobs.length,
      currentJob: this.currentJob?.videoId
    }
  }

  // Get jobs list
  getJobs(): TranscriptJob[] {
    return [...this.jobs]
  }

  // Clear failed jobs
  clearFailed(): number {
    const failedCount = this.jobs.filter(j => j.status === 'failed').length
    this.jobs = this.jobs.filter(j => j.status !== 'failed')
    console.log(`🗑️ Cleared ${failedCount} failed transcript jobs`)
    return failedCount
  }

  // Retry failed jobs
  retryFailed(): number {
    const failedJobs = this.jobs.filter(j => j.status === 'failed')
    failedJobs.forEach(job => {
      job.status = 'pending'
      job.attempts = 0
      job.error = undefined
    })
    
    console.log(`🔄 Retrying ${failedJobs.length} failed transcript jobs`)
    
    if (failedJobs.length > 0 && !this.processing) {
      this.processQueue().catch(error => {
        console.error('Queue processing error during retry:', error)
      })
    }
    
    return failedJobs.length
  }

  // Pause processing
  pause(): void {
    this.processing = false
    console.log('⏸️ Transcript queue paused')
  }

  // Resume processing
  resume(): void {
    if (this.jobs.some(j => j.status === 'pending') && !this.processing) {
      console.log('▶️ Transcript queue resumed')
      this.processQueue().catch(error => {
        console.error('Queue processing error during resume:', error)
      })
    }
  }

  // Clear all jobs
  clearAll(): number {
    const count = this.jobs.length
    this.jobs = []
    this.currentJob = null
    console.log(`🗑️ Cleared all ${count} transcript jobs`)
    return count
  }

  // Process all existing videos without transcripts
async queueAllVideosWithoutTranscripts(): Promise<number> {
  try {
    const videos = await prisma.video.findMany({
      where: {
        AND: [
          { videoUrl: { not: null } },
          {
            OR: [
              { transcript: { is: null } },                              // ✅ no Transcript row
              { transcript: { is: { status: { not: 'COMPLETED' } } } },  // ✅ exists but not completed
            ],
          },
        ],
      },
      select: {
        id: true,
        videoUrl: true,
        title: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`📹 Found ${videos.length} videos without transcripts`)

    for (const video of videos) {
      await this.addJob(video.id, video.videoUrl, 0)
    }

    return videos.length
  } catch (error) {
    console.error('Error queuing videos without transcripts:', error)
    return 0
  }
}


}