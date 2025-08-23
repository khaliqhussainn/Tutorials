// app/api/videos/[videoId]/transcript/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { videoId } = params

    // Check if user has access to this video
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        course: {
          select: {
            id: true,
            isPublished: true,
            enrollments: {
              where: { userId: session.user.id },
              select: { id: true }
            }
          }
        },
        transcript: {
          select: {
            id: true,
            content: true,
            language: true,
            segments: true,
            status: true,
            confidence: true,
            provider: true,
            generatedAt: true
          }
        }
      }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Check if user is enrolled in the course (or is admin)
    const isEnrolled = video.course.enrollments.length > 0
    const isAdmin = session.user.role === 'ADMIN'
    const isCoursePublished = video.course.isPublished

    if (!isEnrolled && !isAdmin && !isCoursePublished) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Return transcript data
    if (!video.transcript) {
      return NextResponse.json({
        videoId: video.id,
        hasTranscript: false,
        transcript: null,
        segments: null,
        status: 'PENDING',
        language: 'en',
        confidence: null,
        provider: null
      })
    }

    return NextResponse.json({
      videoId: video.id,
      hasTranscript: video.transcript.status === 'COMPLETED',
      transcript: video.transcript.content,
      segments: video.transcript.segments,
      status: video.transcript.status,
      language: video.transcript.language,
      confidence: video.transcript.confidence,
      provider: video.transcript.provider,
      generatedAt: video.transcript.generatedAt
    })

  } catch (error) {
    console.error("Error fetching transcript:", error)
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 })
  }
}