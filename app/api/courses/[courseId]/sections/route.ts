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

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // Get the next order number for this course
    const lastSection = await prisma.courseSection.findFirst({
      where: { courseId: params.courseId },
      orderBy: { order: 'desc' }
    })

    const nextOrder = (lastSection?.order || 0) + 1

    const section = await prisma.courseSection.create({
      data: {
        title,
        description: description || null,
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}