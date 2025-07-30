// app/api/admin/courses/[courseId]/duplicate/route.ts - Duplicate course
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

    // Get the original course with all its content
    const originalCourse = await prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        sections: {
          include: {
            videos: {
              include: {
                tests: true
              }
            }
          }
        },
        videos: {
          include: {
            tests: true
          }
        }
      }
    })

    if (!originalCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Create duplicate course
    const duplicatedCourse = await prisma.course.create({
      data: {
        title: `${originalCourse.title} (Copy)`,
        description: originalCourse.description,
        thumbnail: originalCourse.thumbnail,
        category: originalCourse.category,
        level: originalCourse.level,
        isPublished: false, // Always create as draft
        sections: {
          create: originalCourse.sections.map(section => ({
            title: section.title,
            description: section.description,
            order: section.order,
            videos: {
              create: section.videos.map(video => ({
                title: video.title,
                description: video.description,
                videoUrl: video.videoUrl,
                duration: video.duration,
                order: video.order,
                aiPrompt: video.aiPrompt,
                course: { connect: { id: originalCourse.id } }, // Connect to the duplicated course
                tests: {
                  create: video.tests.map(test => ({
                    question: test.question,
                    options: test.options as import("@prisma/client").Prisma.InputJsonValue,
                    correct: test.correct,
                    explanation: test.explanation,
                    difficulty: test.difficulty
                  }))
                }
              }))
            }
          })),
        },
        videos: {
          create: originalCourse.videos.map(video => ({
            title: video.title,
            description: video.description,
            videoUrl: video.videoUrl,
            duration: video.duration,
            order: video.order,
            aiPrompt: video.aiPrompt,
            tests: {
              create: video.tests.map(test => ({
                question: test.question,
                options: test.options as import("@prisma/client").Prisma.InputJsonValue,
                correct: test.correct,
                explanation: test.explanation,
                difficulty: test.difficulty
              }))
            }
          }))
        }
      },
      include: {
        videos: {
          select: { id: true }
        },
        sections: {
          include: {
            videos: {
              select: { id: true }
            }
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    })

    return NextResponse.json(duplicatedCourse)
  } catch (error) {
    console.error("Error duplicating course:", error)
    return NextResponse.json({ error: "Failed to duplicate course" }, { status: 500 })
  }
}
