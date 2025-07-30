// app/api/admin/courses/[courseId]/publish/route.ts - Publish/Unpublish course
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { isPublished } = await request.json()

    // Validate that the course exists
    const existingCourse = await prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        sections: {
          include: {
            videos: true
          }
        },
        videos: true
      }
    })

    if (!existingCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Check if course has content before publishing
    const totalVideos = existingCourse.sections.reduce((acc, section) => acc + section.videos.length, 0) + existingCourse.videos.length
    
    if (isPublished && totalVideos === 0) {
      return NextResponse.json({ 
        error: "Cannot publish course without videos. Please add at least one video before publishing." 
      }, { status: 400 })
    }

    // Update course publication status
    const updatedCourse = await prisma.course.update({
      where: { id: params.courseId },
      data: { 
        isPublished,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(updatedCourse)
  } catch (error) {
    console.error("Error updating course publication status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
