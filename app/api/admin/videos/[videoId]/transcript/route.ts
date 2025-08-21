// app/api/admin/videos/[videoId]/transcript/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TranscriptGenerator } from "@/lib/transcript-generator"

export async function POST(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const videoId = params.videoId

    // Get video details
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        title: true,
        videoUrl: true,
        transcript: true
      }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    if (!video.videoUrl) {
      return NextResponse.json({ error: "Video has no URL" }, { status: 400 })
    }

    // Check if transcript already exists
    if (video.transcript) {
      return NextResponse.json({ 
        message: "Transcript already exists",
        transcript: video.transcript 
      })
    }

    // Generate transcript
    const generator = new TranscriptGenerator('openai') // You can make this configurable
    const transcriptResult = await generator.generateTranscript(video.videoUrl, video.id)

    return NextResponse.json({
      success: true,
      message: "Transcript generated successfully",
      transcript: transcriptResult.transcript,
      confidence: transcriptResult.confidence,
      language: transcriptResult.language,
      segmentCount: transcriptResult.segments.length
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
  request: Request,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const video = await prisma.video.findUnique({
      where: { id: params.videoId },
      select: {
        id: true,
        title: true,
        transcript: true
      }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    return NextResponse.json({
      videoId: video.id,
      title: video.title,
      transcript: video.transcript,
      hasTranscript: !!video.transcript
    })

  } catch (error) {
    console.error("Error fetching transcript:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.video.update({
      where: { id: params.videoId },
      data: { transcript: null }
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