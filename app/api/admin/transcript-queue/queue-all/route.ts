// app/api/admin/transcript-queue/queue-all/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { TranscriptQueue } from "@/lib/transcript-queue"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const queue = TranscriptQueue.getInstance()
    const count = await queue.queueAllVideosWithoutTranscripts()

    return NextResponse.json({
      success: true,
      count,
      message: `Queued ${count} videos for transcript generation`
    })
  } catch (error) {
    console.error("Error queuing all videos:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}