// app/api/progress/test/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { videoId, passed, score } = await request.json()

    // Update video progress with test result
    const progress = await prisma.videoProgress.upsert({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId
        }
      },
      update: {
        testPassed: passed,
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        videoId,
        completed: true,
        testPassed: passed
      }
    })

    // Update course progress
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        course: {
          include: {
            videos: { select: { id: true } }
          }
        }
      }
    })

    if (video) {
      const totalVideos = video.course.videos.length
      const completedVideos = await prisma.videoProgress.count({
        where: {
          userId: session.user.id,
          videoId: { in: video.course.videos.map((v: { id: any }) => v.id) },
          completed: true,
          testPassed: true
        }
      })

      const courseProgress = (completedVideos / totalVideos) * 100

      await prisma.enrollment.update({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: video.courseId
          }
        },
        data: {
          progress: courseProgress,
          updatedAt: new Date()
        }
      })
    }

    return NextResponse.json(progress)
  } catch (error) {
    console.error("Error updating test progress:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}