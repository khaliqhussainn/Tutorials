// app/api/user/courses/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        course: {
          include: {
            videos: { select: { id: true, duration: true } },
            _count: { select: { enrollments: true } }
          }
        }
      }
    })

    // Calculate progress for each course
    const coursesWithProgress = await Promise.all(
      enrollments.map(async (enrollment: { course: { videos: any[] } }) => {
        const totalVideos = enrollment.course.videos.length
        const completedVideos = await prisma.videoProgress.count({
          where: {
            userId: session.user.id,
            videoId: { in: enrollment.course.videos.map((v: { id: any }) => v.id) },
            completed: true,
            testPassed: true
          }
        })
        
        const progress = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0

        return {
          ...enrollment,
          progress
        }
      })
    )

    return NextResponse.json(coursesWithProgress)
  } catch (error) {
    console.error("Error fetching user courses:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
