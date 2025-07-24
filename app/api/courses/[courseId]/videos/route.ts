import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateTestQuestions } from "@/lib/ai"

export async function POST(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const data = await request.json()
    
    // Get the next order number
    const lastVideo = await prisma.video.findFirst({
      where: { courseId: params.courseId },
      orderBy: { order: 'desc' }
    })
    
    const nextOrder = (lastVideo?.order || 0) + 1

    // Create video
    const video = await prisma.video.create({
      data: {
        title: data.title,
        description: data.description,
        videoUrl: data.videoUrl,
        duration: data.duration,
        aiPrompt: data.aiPrompt,
        order: nextOrder,
        courseId: params.courseId,
      }
    })

    // Generate AI test questions
    if (data.aiPrompt) {
      try {
        const questions = await generateTestQuestions(
          data.title,
          data.description,
          data.aiPrompt
        )

        // Create test questions
        for (const question of questions) {
          await prisma.test.create({
            data: {
              videoId: video.id,
              question: question.question,
              options: question.options,
              correct: question.correct,
            }
          })
        }
      } catch (aiError) {
        console.error("AI generation failed:", aiError)
        // Continue without tests if AI fails
      }
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error("Error creating video:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}