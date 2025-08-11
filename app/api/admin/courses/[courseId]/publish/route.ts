// app/api/admin/courses/[courseId]/publish/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  context: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { isPublished } = body
    const courseId = context.params.courseId

    if (typeof isPublished !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request body. isPublished must be a boolean" },
        { status: 400 }
      )
    }

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // Update the course
    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        isPublished: isPublished,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(updatedCourse)
  } catch (error) {
    console.error("Error updating course publish status:", error)
    return NextResponse.json(
      { 
        error: "Failed to update course publish status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}