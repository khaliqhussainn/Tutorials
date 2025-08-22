// app/api/admin/transcript-queue/retry-failed/route.ts
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
    const count = queue.retryFailed()

    return NextResponse.json({
      success: true,
      count,
      message: `Retrying ${count} failed jobs`
    })
  } catch (error) {
    console.error("Error retrying failed jobs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

