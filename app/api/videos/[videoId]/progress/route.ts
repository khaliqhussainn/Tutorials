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

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const videoId = params.videoId

    // Progress is still unique by (userId, videoId)
    const progress = await prisma.videoProgress.findUnique({
      where: {
        userId_videoId: { userId, videoId },
      },
    })

    // Notes are NOT unique, so use findFirst (or findMany if you want all)
    const notes = await prisma.videoNote.findFirst({
      where: {
        userId,
        videoId,
      },
      orderBy: {
        createdAt: "desc", // ✅ optional: get the latest note
      },
    })

    return NextResponse.json({
      completed: progress?.completed ?? false,
      testPassed: progress?.testPassed ?? false,
      watchTime: progress?.watchTime ?? 0,
      testScore: progress?.testScore ?? 0,
      testAttempts: progress?.testAttempts ?? 0,
      notes: notes?.content ?? "",
    })
  } catch (error) {
    console.error("Error fetching video progress:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
