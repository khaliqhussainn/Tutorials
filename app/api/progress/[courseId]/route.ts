// app/api/progress/[courseId]/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all video progress for this user and course
    const progress = await prisma.videoProgress.findMany({
      where: {
        userId: session.user.id,
        video: {
          courseId: params.courseId
        }
      },
      select: {
        videoId: true,
        completed: true,
        testPassed: true,
        testScore: true,
        testAttempts: true
      }
    })

    return NextResponse.json(progress)
  } catch (error) {
    console.error("Error fetching progress:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}