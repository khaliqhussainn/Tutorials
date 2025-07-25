// app/api/courses/[courseId]/videos/route.ts - Updated with sections support
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
    
    // Get the next order number based on section or course
    let nextOrder = 1
    
    if (data.sectionId) {
      // Video belongs to a section - get next order within that section
      const lastVideo = await prisma.video.findFirst({
        where: { 
          sectionId: data.sectionId,
          courseId: params.courseId 
        },
        orderBy: { order: 'desc' }
      })
      nextOrder = (lastVideo?.order || 0) + 1
    } else {
      // Legacy video without section - get next order for course videos without sections
      const lastVideo = await prisma.video.findFirst({
        where: { 
          courseId: params.courseId,
          sectionId: null 
        },
        orderBy: { order: 'desc' }
      })
      nextOrder = (lastVideo?.order || 0) + 1
    }

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
        sectionId: data.sectionId || null, // Can be null for legacy videos
      }
    })

    // Generate AI test questions
    if (data.aiPrompt) {
      try {
        const questions = await generateTestQuestions(
          data.title,
          data.description || '',
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

        console.log(`Generated ${questions.length} test questions for video: ${video.title}`)
      } catch (aiError) {
        console.error("AI generation failed:", aiError)
        // Continue without tests if AI fails - video is still created
      }
    }

    // Return video with tests included
    const videoWithTests = await prisma.video.findUnique({
      where: { id: video.id },
      include: {
        tests: { select: { id: true } }
      }
    })

    return NextResponse.json(videoWithTests)
  } catch (error) {
    console.error("Error creating video:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
