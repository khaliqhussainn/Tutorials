// app/api/videos/[videoId]/stats/route.ts - Get video statistics
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

    // Get video statistics
    const stats = await prisma.videoProgress.aggregate({
      where: { videoId: params.videoId },
      _count: {
        id: true
      }
    })

    const quizStats = await prisma.quizAttempt.aggregate({
      where: { videoId: params.videoId },
      _avg: {
        score: true
      }
    })

    return NextResponse.json({
      totalWatches: stats._count.id || 0,
      avgRating: 0, // Placeholder for future rating system
      avgQuizScore: quizStats._avg.score || 0
    })
  } catch (error) {
    console.error("Error fetching video stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}