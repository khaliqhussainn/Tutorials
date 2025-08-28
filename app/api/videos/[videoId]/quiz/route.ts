// app/api/videos/[videoId]/quiz/route.ts
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

    // Get video with quiz questions
    const video = await prisma.video.findUnique({
      where: { id: params.videoId },
      include: {
        tests: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            question: true,
            options: true,
            correct: true,
            explanation: true,
            difficulty: true,
            points: true,
            order: true
          }
        },
        course: {
          select: {
            id: true,
            title: true,
            isPublished: true,
            enrollments: {
              where: { userId: session.user.id },
              select: { id: true }
            }
          }
        }
      }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Check access
    const isEnrolled = video.course.enrollments.length > 0
    const isAdmin = session.user.role === 'ADMIN'
    const isCoursePublished = video.course.isPublished

    if (!isEnrolled && !isAdmin && !isCoursePublished) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get user's previous quiz attempts
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: {
        userId: session.user.id,
        videoId: params.videoId
      },
      orderBy: { completedAt: 'desc' },
      take: 10
    })

    // Parse answers from previous attempts
    const previousAttempts = quizAttempts.map(attempt => ({
      id: attempt.id,
      score: attempt.score,
      passed: attempt.passed,
      answers: JSON.parse(attempt.answers),
      timeSpent: attempt.timeSpent,
      completedAt: attempt.completedAt.toISOString(),
      attemptNumber: quizAttempts.indexOf(attempt) + 1
    }))

    return NextResponse.json({
      video: {
        id: video.id,
        title: video.title,
        description: video.description
      },
      course: {
        id: video.course.id,
        title: video.course.title
      },
      questions: video.tests,
      hasQuiz: video.tests.length > 0,
      previousAttempts,
      bestScore: previousAttempts.length > 0 ? Math.max(...previousAttempts.map(a => a.score)) : null,
      attemptsCount: previousAttempts.length
    })

  } catch (error) {
    console.error("Error fetching quiz:", error)
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 })
  }
}