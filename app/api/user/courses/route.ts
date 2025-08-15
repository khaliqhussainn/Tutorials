// app/api/user/courses/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
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
      enrollments.map(async (enrollment) => {
        const totalVideos = enrollment.course.videos.length
        const completedVideos = await prisma.videoProgress.count({
          where: {
            userId: user.id,
            videoId: { in: enrollment.course.videos.map(v => v.id) },
            completed: true
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