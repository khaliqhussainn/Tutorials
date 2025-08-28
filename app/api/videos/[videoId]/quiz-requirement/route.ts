// app/api/videos/[videoId]/quiz-requirement/route.ts
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

    const { videoId } = params

    // Get video with quiz questions
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        tests: {
          select: { id: true }
        },
        course: {
          select: {
            id: true,
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

    // Get user's progress for this video
    const progress = await prisma.videoProgress.findUnique({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId
        }
      }
    })

    const hasQuiz = video.tests.length > 0
    const videoCompleted = progress?.completed || false
    const quizPassed = progress?.testPassed || false
    
    // User needs to take quiz if:
    // 1. Video has quiz questions
    // 2. User has completed watching the video
    // 3. User hasn't passed the quiz yet
    const needsQuiz = hasQuiz && videoCompleted && !quizPassed
    
    // User can proceed to next video if:
    // 1. Video has no quiz, OR
    // 2. User has passed the quiz
    const canProceed = !hasQuiz || quizPassed

    return NextResponse.json({
      needsQuiz,
      hasQuiz,
      videoCompleted,
      quizPassed,
      canProceed,
      quizScore: progress?.testScore || 0,
      attempts: progress?.testAttempts || 0
    })

  } catch (error) {
    console.error("Error checking quiz requirement:", error)
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 })
  }
}
