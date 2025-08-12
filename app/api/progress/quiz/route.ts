// app/api/progress/quiz/route.ts - FIXED to properly handle quiz completion
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

    const { videoId, score, passed, timeSpent, answers } = await request.json()

    // Get current attempt count
    const currentProgress = await prisma.videoProgress.findUnique({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId
        }
      }
    })

    // Update video progress with test results
    const progress = await prisma.videoProgress.upsert({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId
        }
      },
      update: {
        testPassed: passed,
        testScore: Math.max(score, currentProgress?.testScore || 0), // Keep highest score
        testAttempts: {
          increment: 1
        },
        ...(passed && { testPassedAt: new Date() })
      },
      create: {
        userId: session.user.id,
        videoId,
        testPassed: passed,
        testScore: Math.max(score, 0),
        testAttempts: 1,
        completed: true,
        completedAt: new Date(),
        ...(passed && { testPassedAt: new Date() })
      }
    })

    // Save detailed quiz attempt record
    if (answers) {
      await prisma.quizAttempt.create({
        data: {
          userId: session.user.id,
          videoId,
          answers: JSON.stringify(answers),
          score,
          passed,
          timeSpent: timeSpent || 0
        }
      })
    }

    return NextResponse.json(progress)
  } catch (error) {
    console.error("Error updating quiz progress:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}