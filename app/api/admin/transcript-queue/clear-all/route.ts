
// app/api/admin/transcript-queue/clear-all/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { TranscriptQueue } from "@/lib/transcript-queue"

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const queue = TranscriptQueue.getInstance()
    const count = queue.clearAll()

    return NextResponse.json({
      success: true,
      count,
      message: `Cleared all ${count} jobs`
    })
  } catch (error) {
    console.error("Error clearing all jobs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
