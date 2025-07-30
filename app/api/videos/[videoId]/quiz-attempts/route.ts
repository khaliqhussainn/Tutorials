// app/api/videos/[videoId]/quiz-attempts/route.ts - Get previous quiz attempts
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

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        userId: session.user.id,
        videoId: params.videoId
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        score: true,
        passed: true,
        timeSpent: true,
        attemptNumber: true,
        createdAt: true
      }
    })

    return NextResponse.json(attempts)
  } catch (error) {
    console.error("Error fetching quiz attempts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
