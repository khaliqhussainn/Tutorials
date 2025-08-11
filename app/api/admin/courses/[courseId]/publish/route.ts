// app/api/admin/courses/[courseId]/publish/route.ts - Publish/unpublish course
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function PATCH(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { isPublished } = body

    if (typeof isPublished !== 'boolean') {
      return NextResponse.json({ 
        error: "Invalid request body. isPublished must be a boolean" 
      }, { status: 400 })
    }

    // Validate that the course exists
    const existingCourse = await prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        sections: {
          include: {
            videos: true
          }
        },
        videos: {
          where: { sectionId: null }
        }
      }
    })

    if (!existingCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Check if course has content before publishing
    if (isPublished) {
      const totalVideos = existingCourse.videos.length + 
        existingCourse.sections.reduce((acc, section) => acc + section.videos.length, 0)
      
      if (totalVideos === 0) {
        return NextResponse.json({ 
          error: "Cannot publish course without any videos" 
        }, { status: 400 })
      }

      if (!existingCourse.thumbnail) {
        return NextResponse.json({ 
          error: "Cannot publish course without a thumbnail" 
        }, { status: 400 })
      }
    }

    // Update the course
    const updatedCourse = await prisma.course.update({
      where: { id: params.courseId },
      data: {
        isPublished: isPublished,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(updatedCourse)
  } catch (error) {
    console.error("Error updating course publish status:", error)
    
    // Better error handling
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: "Course not found" }, { status: 404 })
      }
    }
    
    return NextResponse.json({ 
      error: "Failed to update course publish status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}