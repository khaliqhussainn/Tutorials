// app/api/videos/[videoId]/quiz-attempts/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        userId: session.user.id,
        videoId: params.videoId
      },
      orderBy: { completedAt: 'desc' }
    })

    const formattedAttempts = attempts.map((attempt, index) => ({
      id: attempt.id,
      score: attempt.score,
      passed: attempt.passed,
      answers: JSON.parse(attempt.answers),
      timeSpent: attempt.timeSpent,
      completedAt: attempt.completedAt.toISOString(),
      attemptNumber: attempts.length - index
    }))

    return NextResponse.json(formattedAttempts)

  } catch (error) {
    console.error("Error fetching quiz attempts:", error)
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { answers, timeSpent } = await request.json()

    // Get quiz questions to calculate score
    const video = await prisma.video.findUnique({
      where: { id: params.videoId },
      include: {
        tests: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!video || video.tests.length === 0) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    // Calculate score
    let correctAnswers = 0
    let totalPoints = 0
    let earnedPoints = 0

    video.tests.forEach((question, index) => {
      totalPoints += question.points
      if (answers[index] === question.correct) {
        correctAnswers++
        earnedPoints += question.points
      }
    })

    const score = Math.round((earnedPoints / totalPoints) * 100)
    const passed = score >= 70 // 70% passing threshold

    // Save quiz attempt
    const quizAttempt = await prisma.quizAttempt.create({
      data: {
        userId: session.user.id,
        videoId: params.videoId,
        answers: JSON.stringify(answers),
        score,
        passed,
        timeSpent: timeSpent || 0
      }
    })

    // Update video progress
    await prisma.videoProgress.upsert({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId: params.videoId
        }
      },
      update: {
        testPassed: passed,
        testPassedAt: passed ? new Date() : null,
        testScore: score,
        testAttempts: {
          increment: 1
        }
      },
      create: {
        userId: session.user.id,
        videoId: params.videoId,
        testPassed: passed,
        testPassedAt: passed ? new Date() : null,
        testScore: score,
        testAttempts: 1,
        completed: false,
        watchTime: 0
      }
    })

    return NextResponse.json({
      success: true,
      attemptId: quizAttempt.id,
      score,
      passed,
      correctAnswers,
      totalQuestions: video.tests.length,
      earnedPoints,
      totalPoints,
      message: passed ? 'Congratulations! You passed the quiz.' : 'Keep studying and try again.'
    })

  } catch (error) {
    console.error("Error submitting quiz:", error)
    return NextResponse.json({ 
      error: "Failed to submit quiz" 
    }, { status: 500 })
  }
}
