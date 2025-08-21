// app/api/admin/videos/bulk-transcript/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { TranscriptGenerator } from "@/lib/transcript-generator"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { provider = 'openai' } = await request.json()

    // Start bulk transcript generation in background
    // Note: In production, you'd want to use a job queue like Bull or Agenda
    TranscriptGenerator.generateTranscriptsForAllVideos()
      .catch(error => console.error('Bulk transcript generation failed:', error))

    return NextResponse.json({
      success: true,
      message: "Bulk transcript generation started in background"
    })

  } catch (error) {
    console.error("Error starting bulk transcript generation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}