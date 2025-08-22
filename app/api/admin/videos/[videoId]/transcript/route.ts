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

    const { videoId } = params

    // Get video details
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        transcript: true
      }
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

    // Generate transcript
    console.log(`🎬 Generating transcript for video: ${videoId}`)
    
    const generator = new TranscriptGenerator('openai')
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

  } catch (error) {
    console.error("Error generating transcript:", error)
    return NextResponse.json({ 
      error: "Failed to generate transcript",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const video = await prisma.video.findUnique({
      where: { id: params.videoId },
      include: {
        transcript: true
      }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    return NextResponse.json({
      videoId: video.id,
      title: video.title,
      transcript: video.transcript?.content || null,
      segments: video.transcript?.segments || null,
      status: video.transcript?.status || 'PENDING',
      language: video.transcript?.language || 'en',
      confidence: video.transcript?.confidence || null,
      provider: video.transcript?.provider || null,
      hasTranscript: !!video.transcript && video.transcript.status === 'COMPLETED'
    })

  } catch (error) {
    console.error("Error fetching transcript:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.transcript.delete({
      where: { videoId: params.videoId }
    })

    return NextResponse.json({ 
      success: true,
      message: "Transcript deleted successfully" 
    })

  } catch (error) {
    console.error("Error deleting transcript:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}