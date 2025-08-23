// app/api/videos/[videoId]/route.ts
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

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        tests: {
          orderBy: { order: 'asc' }
        },
        transcript: {
          select: {
            id: true,
            status: true,
            content: true,
            language: true,
            segments: true,
            confidence: true,
            provider: true
          }
        },
        course: {
          select: {
            id: true,
            title: true,
            isPublished: true,
            enrollments: {
              where: { userId: session.user.id },
              select: { id: true }
            }
          }
        }
      }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Check access permissions
    const isEnrolled = video.course.enrollments.length > 0
    const isAdmin = session.user.role === 'ADMIN'
    const isCoursePublished = video.course.isPublished

    if (!isEnrolled && !isAdmin && !isCoursePublished) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json(video)

  } catch (error) {
    console.error("Error fetching video:", error)
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 })
  }
}