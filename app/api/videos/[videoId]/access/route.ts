// app/api/videos/[videoId]/access/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
      include: {
        course: {
          include: {
            videos: {
              orderBy: { order: 'asc' },
              select: { id: true, order: true }
            }
          }
        }
      }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Check if user is enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: video.courseId
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ canWatch: false })
    }

    // Check if this is the first video or if previous video is completed
    const currentIndex = video.course.videos.findIndex((v: { id: any }) => v.id === video.id)
    let canWatch = true

    if (currentIndex > 0) {
      const prevVideo = video.course.videos[currentIndex - 1]
      const prevProgress = await prisma.videoProgress.findUnique({
        where: {
          userId_videoId: {
            userId: session.user.id,
            videoId: prevVideo.id
          }
        }
      })

      canWatch = prevProgress?.completed && prevProgress?.testPassed
    }

    // Get current video progress
    const progress = await prisma.videoProgress.findUnique({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId: params.videoId
        }
      }
    })

    return NextResponse.json({
      canWatch,
      completed: progress?.completed || false,
      testPassed: progress?.testPassed || false,
      watchTime: progress?.watchTime || 0
    })
  } catch (error) {
    console.error("Error checking video access:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
