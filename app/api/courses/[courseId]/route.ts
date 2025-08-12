// app/api/courses/[courseId]/route.ts - FIXED to properly include video durations
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const course = await prisma.course.findUnique({
      where: { 
        id: params.courseId,
        isPublished: true 
      },
      include: {
        sections: {
          include: {
            videos: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                duration: true,
                order: true,
                tests: {
                  select: {
                    id: true
                  }
                }
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        videos: {
          where: { sectionId: null },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            order: true,
            tests: {
              select: {
                id: true
              }
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

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    return NextResponse.json(course)
  } catch (error) {
    console.error("Error fetching course:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
