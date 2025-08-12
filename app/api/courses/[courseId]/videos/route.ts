// app/api/courses/[courseId]/videos/route.ts - FIXED
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, description, videoUrl, duration, aiPrompt, sectionId } = await request.json()

    // Validate required fields
    if (!title || !videoUrl || !sectionId) {
      return NextResponse.json({
        error: "Missing required fields: title, videoUrl, and sectionId are required"
      }, { status: 400 })
    }

    // Verify section exists and belongs to the course
    const section = await prisma.courseSection.findFirst({
      where: { 
        id: sectionId,
        courseId: params.courseId
      }
    })

    if (!section) {
      return NextResponse.json({
        error: "Invalid section ID or section doesn't belong to this course"
      }, { status: 400 })
    }

    // Get next order number within the section
    const lastVideo = await prisma.video.findFirst({
      where: { 
        sectionId: sectionId
      },
      orderBy: { order: 'desc' }
    })

    const nextOrder = (lastVideo?.order || 0) + 1

    // Create video
    const video = await prisma.video.create({
      data: {
        title,
        description: description || null,
        videoUrl,
        duration: duration || 0,
        order: nextOrder,
        courseId: params.courseId,
        sectionId,
        aiPrompt: aiPrompt || null
      },
      include: {
        tests: {
          select: {
            id: true,
            question: true,
            options: true,
            correct: true,
            explanation: true,
            difficulty: true
          }
        }
      }
    })

    // Generate AI tests if prompt is provided
    if (aiPrompt) {
      try {
        // Simple test generation - replace with your AI service
        const sampleTests = [
          {
            question: `What is the main topic covered in "${title}"?`,
            options: [
              "The main concept explained in the video",
              "Secondary topic",
              "Unrelated topic",
              "None of the above"
            ],
            correct: 0,
            explanation: "Based on the video content and description provided.",
            difficulty: "medium"
          }
        ]

        for (const test of sampleTests) {
          await prisma.test.create({
            data: {
              videoId: video.id,
              question: test.question,
              options: test.options,
              correct: test.correct,
              explanation: test.explanation,
              difficulty: test.difficulty
            }
          })
        }
      } catch (testError) {
        console.error('AI test generation failed:', testError)
        // Continue without failing the video creation
      }
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error("Error creating video:", error)
    return NextResponse.json({ 
      error: "Failed to create video",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}