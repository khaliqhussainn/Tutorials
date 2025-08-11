// app/api/admin/courses/[courseId]/duplicate/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const courseId = context.params.courseId

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // Get the original course
    const originalCourse = await prisma.course.findUnique({
      where: { id: courseId },
    })

    if (!originalCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Create basic duplicate
    const duplicatedCourse = await prisma.course.create({
      data: {
        title: `${originalCourse.title} (Copy)`,
        description: originalCourse.description,
        thumbnail: originalCourse.thumbnail,
        category: originalCourse.category,
        level: originalCourse.level,
        isPublished: false,
      },
    })

    // Get the course with related data for response
    const courseWithData = await prisma.course.findUnique({
      where: { id: duplicatedCourse.id },
      include: {
        videos: {
          select: { id: true },
        },
        sections: {
          include: {
            videos: {
              select: { id: true },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    })

    return NextResponse.json(courseWithData)
  } catch (error) {
    console.error("Error duplicating course:", error)
    return NextResponse.json(
      { 
        error: "Failed to duplicate course",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}