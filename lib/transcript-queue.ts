// lib/transcript-queue.ts - Queue system for processing transcripts in background
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
}

export class TranscriptQueue {
  private static instance: TranscriptQueue
  private processing = false
  private jobs: TranscriptJob[] = []

  static getInstance(): TranscriptQueue {
    if (!TranscriptQueue.instance) {
      TranscriptQueue.instance = new TranscriptQueue()
    }
    return TranscriptQueue.instance
  }

  // Add a video to the transcript generation queue
  async addJob(videoId: string, videoUrl: string, priority = 0): Promise<void> {
    const job: TranscriptJob = {
      id: `transcript-${videoId}-${Date.now()}`,
      videoId,
      videoUrl,
      priority,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: 3,
      status: 'pending'
    }

    this.jobs.push(job)
    this.jobs.sort((a, b) => b.priority - a.priority) // Higher priority first

    console.log(`📝 Added transcript job for video ${videoId}`)

    if (!this.processing) {
      this.processQueue()
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

      try {
        job.status = 'processing'
        job.attempts++

        console.log(`📹 Processing transcript for video ${job.videoId} (attempt ${job.attempts}/${job.maxAttempts})`)

        const generator = new TranscriptGenerator()
        await generator.generateTranscript(job.videoUrl, job.videoId)

        job.status = 'completed'
        console.log(`✅ Transcript completed for video ${job.videoId}`)

        // Remove completed job
        this.jobs = this.jobs.filter(j => j.id !== job.id)

        // Add delay between jobs to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error: any) {
        console.error(`❌ Transcript failed for video ${job.videoId}:`, error.message)

        if (job.attempts >= job.maxAttempts) {
          job.status = 'failed'
          job.error = error.message
          
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

    this.processing = false
    console.log('✅ Transcript queue processing completed')
  }

  // Get queue status
  getStatus(): { pending: number; processing: number; total: number } {
    return {
      pending: this.jobs.filter(j => j.status === 'pending').length,
      processing: this.jobs.filter(j => j.status === 'processing').length,
      total: this.jobs.length
    }
  }

  // Clear failed jobs
  clearFailed(): void {
    const failedCount = this.jobs.filter(j => j.status === 'failed').length
    this.jobs = this.jobs.filter(j => j.status !== 'failed')
    console.log(`🗑️ Cleared ${failedCount} failed transcript jobs`)
  }
}
