// app/api/admin/courses/[courseId]/route.ts - Updated with sections support
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            videos: {
              orderBy: { order: 'asc' },
              include: {
                tests: { select: { id: true } }
              }
            }
          }
        },
        videos: {
          where: { section: null }, // Videos without sections (legacy)
          orderBy: { order: 'asc' },
          include: {
            tests: { select: { id: true } }
          }
        }
      }
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    return NextResponse.json(course)
  } catch (error) {
    console.error("Error fetching course:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()
    
    const course = await prisma.course.update({
      where: { id: params.courseId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.category && { category: data.category }),
        ...(data.level && { level: data.level }),
        ...(data.thumbnail && { thumbnail: data.thumbnail }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      }
    })

    return NextResponse.json(course)
  } catch (error) {
    console.error("Error updating course:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete course and all related data (videos, tests, sections, etc.)
    // Prisma cascade delete will handle related records
    await prisma.course.delete({
      where: { id: params.courseId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting course:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}