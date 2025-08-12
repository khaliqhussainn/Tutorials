// app/api/progress/video/route.ts
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

    const { videoId, watchTime, completed } = await request.json()

    const progress = await prisma.videoProgress.upsert({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId
        }
      },
      update: {
        watchTime: Math.max(watchTime, 0),
        ...(completed && { completed: true, completedAt: new Date() })
      },
      create: {
        userId: session.user.id,
        videoId,
        watchTime: Math.max(watchTime, 0),
        completed: completed || false,
        ...(completed && { completedAt: new Date() })
      }
    })

    return NextResponse.json(progress)
  } catch (error) {
    console.error("Error updating video progress:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
