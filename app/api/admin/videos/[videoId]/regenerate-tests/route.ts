// app/api/admin/videos/[videoId]/regenerate-tests/route.ts - Regenerate AI tests
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateTestQuestions } from "@/lib/ai"

export async function POST(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { difficulty, questionCount, focusAreas, avoidTopics } = await request.json()

    // Get video details
    const video = await prisma.video.findUnique({
      where: { id: params.videoId },
      select: {
        id: true,
        title: true,
        description: true,
        aiPrompt: true
      }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    if (!video.aiPrompt) {
      return NextResponse.json({ 
        error: "No AI prompt available for this video" 
      }, { status: 400 })
    }

    // Delete existing tests
    await prisma.test.deleteMany({
      where: { videoId: params.videoId }
    })

    // Generate new questions
    const questions = await generateTestQuestions(
      video.title,
      video.description || '',
      video.aiPrompt,
      difficulty || 'mixed',
      questionCount || 5
    )

    // Save new tests
    const createdTests = await Promise.all(
      questions.map(question =>
        prisma.test.create({
          data: {
            videoId: params.videoId,
            question: question.question,
            options: question.options,
            correct: question.correct,
            difficulty: question.difficulty
          }
        })
      )
    )

    return NextResponse.json({ 
      success: true, 
      testsCreated: createdTests.length,
      tests: createdTests 
    })
  } catch (error) {
    console.error("Error regenerating tests:", error)
    return NextResponse.json({ 
      error: "Failed to regenerate tests",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}