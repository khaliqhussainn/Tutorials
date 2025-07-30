// app/api/admin/courses/[courseId]/route.ts - Enhanced PATCH and DELETE
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
            }
          }
        },
        videos: {
          where: { sectionId: null },
          orderBy: { order: 'asc' },
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

    const updatedCourse = await prisma.course.update({
      where: { id: params.courseId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(updatedCourse)
  } catch (error) {
    console.error("Error updating course:", error)
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 })
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

    // Check if course exists and get enrollment count
    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Prevent deletion if students are enrolled
    if (course._count.enrollments > 0) {
      return NextResponse.json({ 
        error: `Cannot delete course with ${course._count.enrollments} enrolled students. Please contact students or transfer them first.` 
      }, { status: 400 })
    }

    // Delete course (cascading will handle sections, videos, tests, etc.)
    await prisma.course.delete({
      where: { id: params.courseId }
    })

    return NextResponse.json({ success: true, message: "Course deleted successfully" })
  } catch (error) {
    console.error("Error deleting course:", error)
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 })
  }
}