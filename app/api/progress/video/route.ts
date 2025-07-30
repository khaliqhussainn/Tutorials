// app/api/progress/video/route.ts - Update video progress
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

    const { videoId, completed, watchTime } = await request.json()

    const progress = await prisma.videoProgress.upsert({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId
        }
      },
      update: {
        completed: completed !== undefined ? completed : undefined,
        watchTime: watchTime !== undefined ? Math.max(watchTime, 0) : undefined,
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        videoId,
        completed: completed || false,
        watchTime: Math.max(watchTime || 0, 0)
      }
    })

    return NextResponse.json(progress)
  } catch (error) {
    console.error("Error updating video progress:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
