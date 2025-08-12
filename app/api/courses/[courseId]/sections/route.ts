// app/api/courses/[courseId]/sections/route.ts - FIXED
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

    const { title, description } = await request.json()

    if (!title?.trim()) {
      return NextResponse.json({ error: "Section title is required" }, { status: 400 })
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: params.courseId }
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Get next order number
    const lastSection = await prisma.courseSection.findFirst({
      where: { courseId: params.courseId },
      orderBy: { order: 'desc' }
    })

    const nextOrder = (lastSection?.order || 0) + 1

    const section = await prisma.courseSection.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        order: nextOrder,
        courseId: params.courseId
      },
      include: {
        videos: {
          orderBy: { order: 'asc' },
          include: {
            tests: { select: { id: true } }
          }
        }
      }
    })

    return NextResponse.json(section)
  } catch (error) {
    console.error("Error creating section:", error)
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 })
  }
}