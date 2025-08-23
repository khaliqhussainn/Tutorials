// app/api/admin/videos/[videoId]/transcript/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TranscriptGenerator } from "@/lib/transcript-generator"

export async function POST(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if any transcript provider is configured
    const hasAssemblyAI = !!process.env.ASSEMBLYAI_API_KEY
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    
    if (!hasAssemblyAI && !hasOpenAI) {
      return NextResponse.json({ 
        error: "No transcript provider configured. Please add ASSEMBLYAI_API_KEY or OPENAI_API_KEY to your environment variables." 
      }, { status: 400 })
    }

    const { videoId } = params

    // Get video details
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { transcript: true }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    if (!video.videoUrl) {
      return NextResponse.json({ error: "Video has no URL" }, { status: 400 })
    }

    // Check if transcript already exists and is completed
    if (video.transcript?.status === 'COMPLETED') {
      return NextResponse.json({ 
        message: "Transcript already exists",
        transcript: video.transcript 
      })
    }

    // Auto-select best provider
    const provider = hasAssemblyAI ? 'assemblyai' : 'openai'
    
    console.log(`🎬 Generating transcript for video: ${videoId} using ${provider}`)
    
    const generator = new TranscriptGenerator(provider)
    const transcriptResult = await generator.generateTranscript(video.id, video.videoUrl)

    return NextResponse.json({
      success: true,
      message: "Transcript generated successfully",
      transcript: transcriptResult,
      confidence: transcriptResult.confidence,
      language: transcriptResult.language,
      segmentCount: transcriptResult.segments.length,
      provider: transcriptResult.provider
    })

  } catch (error: any) {
    console.error("Error generating transcript:", error)
    
    // Enhanced error response
    let errorMessage = "Failed to generate transcript"
    let statusCode = 500
    
    if (error.message.includes('quota exceeded') || error.message.includes('insufficient_quota')) {
      errorMessage = "API quota exceeded. Please check your billing and add credits to your account."
      statusCode = 402
    } else if (error.message.includes('Invalid') && error.message.includes('API key')) {
      errorMessage = "API key is invalid. Please check your configuration."
      statusCode = 401
    } else if (error.message.includes('too large')) {
      errorMessage = "Video file is too large for transcript generation."
      statusCode = 413
    } else if (error.message.includes('not configured')) {
      errorMessage = "Transcript provider not configured properly."
      statusCode = 400
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error.message,
      provider: error.message.includes('AssemblyAI') ? 'assemblyai' : 
                error.message.includes('OpenAI') ? 'openai' : 'unknown'
    }, { status: statusCode })
  }
}