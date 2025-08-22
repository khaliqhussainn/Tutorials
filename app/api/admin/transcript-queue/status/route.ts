// / app/api/admin/transcript-queue/status/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { TranscriptQueue } from "@/lib/transcript-queue"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const queue = TranscriptQueue.getInstance()
    const status = queue.getStatus()
    const jobs = queue.getJobs()

    return NextResponse.json({
      status,
      jobs: jobs.map(job => ({
        id: job.id,
        videoId: job.videoId,
        priority: job.priority,
        status: job.status,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        createdAt: job.createdAt,
        error: job.error
      }))
    })
  } catch (error) {
    console.error("Error fetching queue status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

