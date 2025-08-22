// app/api/admin/courses/[courseId]/sections/route.ts - FIXED
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
      }
    })

    return NextResponse.json({
      success: true,
      section,
      message: "Section created successfully"
    })
  } catch (error) {
    console.error("Error creating section:", error)
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
   
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sections = await prisma.courseSection.findMany({
      where: { courseId: params.courseId },
      orderBy: { order: 'asc' },
      include: {
        videos: {
          select: {
            id: true,
            title: true,
            order: true
          },
          orderBy: { order: 'asc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      sections
    })
  } catch (error) {
    console.error("Error fetching sections:", error)
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 })
  }
}