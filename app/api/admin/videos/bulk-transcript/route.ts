// app/api/admin/videos/bulk-transcript/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { TranscriptGenerator } from "@/lib/transcript-generator"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Start bulk generation (this will run in the background)
    TranscriptGenerator.generateTranscriptsForAllVideos().catch(console.error)
    
    return NextResponse.json({ 
      success: true,
      message: "Bulk transcript generation started. Check server logs for progress."
    })

  } catch (error) {
    console.error("Error starting bulk transcript generation:", error)
    return NextResponse.json({ 
      error: "Failed to start bulk transcript generation",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}