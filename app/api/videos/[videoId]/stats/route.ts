// app/api/videos/[videoId]/stats/route.ts
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
    const [totalWatches, avgWatchTime] = await Promise.all([
      prisma.videoProgress.count({
        where: { videoId: params.videoId }
      }),
      prisma.videoProgress.aggregate({
        where: { videoId: params.videoId },
        _avg: { watchTime: true }
      })
    ])

    return NextResponse.json({
      totalWatches,
      avgWatchTime: Math.round(avgWatchTime._avg.watchTime || 0),
      avgRating: 4.5 // Placeholder for rating system
    })
  } catch (error) {
    console.error("Error fetching video stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
