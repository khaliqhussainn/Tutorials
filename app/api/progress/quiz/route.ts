// app/api/progress/quiz/route.ts - FIXED quiz submission with proper validation
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { videoId, answers, timeSpent } = await request.json()

    // Validate inputs
    if (!videoId || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Invalid quiz data" }, { status: 400 })
    }

    // Get video with tests to validate answers
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        tests: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!video || video.tests.length === 0) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    if (answers.length !== video.tests.length) {
      return NextResponse.json({ error: "Invalid number of answers" }, { status: 400 })
    }

    // Calculate score server-side (authoritative)
    let correctCount = 0
    let totalPoints = 0
    let earnedPoints = 0

    video.tests.forEach((test, index) => {
      const points = test.points || 10
      totalPoints += points
      
      // Check if answer is correct
      if (answers[index] === test.correct) {
        correctCount++
        earnedPoints += points
      }
    })

    // Calculate final score and pass status
    const finalScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
    const finalPassed = finalScore >= 70 // 70% threshold enforced

    console.log(`Quiz submission for video ${videoId}:`, {
      correct: correctCount,
      total: video.tests.length,
      score: finalScore,
      passed: finalPassed,
      threshold: '70%'
    })

    // Save quiz attempt
    const quizAttempt = await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        videoId,
        answers: JSON.stringify(answers),
        score: finalScore,
        passed: finalPassed,
        timeSpent: timeSpent || 0
      }
    })

    // Update video progress
    await prisma.videoProgress.upsert({
      where: {
        userId_videoId: {
          userId: user.id,
          videoId
        }
      },
      update: {
        testPassed: finalPassed,
        testPassedAt: finalPassed ? new Date() : null,
        testScore: finalScore,
        testAttempts: {
          increment: 1
        }
      },
      create: {
        userId: user.id,
        videoId,
        testPassed: finalPassed,
        testPassedAt: finalPassed ? new Date() : null,
        testScore: finalScore,
        testAttempts: 1,
        completed: false,
        watchTime: 0
      }
    })

    return NextResponse.json({
      success: true,
      attemptId: quizAttempt.id,
      score: finalScore,
      passed: finalPassed,
      correctAnswers: correctCount,
      totalQuestions: video.tests.length,
      earnedPoints,
      totalPoints,
      passingScore: 70,
      message: finalPassed 
        ? 'Congratulations! You passed the quiz.' 
        : `You scored ${finalScore}%. You need 70% to pass. Keep studying and try again!`
    })

  } catch (error) {
    console.error("Error submitting quiz:", error)
    return NextResponse.json({ 
      error: "Failed to submit quiz" 
    }, { status: 500 })
  }
}