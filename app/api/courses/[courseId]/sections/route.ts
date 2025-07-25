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

    const data = await request.json()
    
    // Get the next order number for sections
    const lastSection = await prisma.courseSection.findFirst({
      where: { courseId: params.courseId },
      orderBy: { order: 'desc' }
    })
    
    const nextOrder = (lastSection?.order || 0) + 1

    // Create section
    const section = await prisma.courseSection.create({
      data: {
        title: data.title,
        description: data.description || null,
        order: nextOrder,
        courseId: params.courseId,
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
          orderBy: { order: 'asc' },
          include: {
            tests: { select: { id: true } }
          }
        }
      }
    })

    return NextResponse.json(sections)
  } catch (error) {
    console.error("Error fetching sections:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}