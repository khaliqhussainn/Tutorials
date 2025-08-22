// app/api/admin/transcripts/bulk-generate/route.ts
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

    const { provider = 'openai', batchSize = 10 } = await request.json()

    console.log('🚀 Starting bulk transcript generation...')

    // Start bulk generation in background
    TranscriptGenerator.generateTranscriptsForAllVideos()
      .then(() => {
        console.log('✅ Bulk transcript generation completed')
      })
      .catch(error => {
        console.error('❌ Bulk transcript generation failed:', error)
      })

    return NextResponse.json({
      success: true,
      message: "Bulk transcript generation started in background",
      provider,
      note: "Check the logs or transcript status API for progress updates"
    })

  } catch (error) {
    console.error("Error starting bulk transcript generation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}