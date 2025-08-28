// app/api/courses/[courseId]/announcements/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const announcements = await prisma.courseAnnouncement.findMany({
      where: {
        courseId: params.courseId,
        isPublished: true
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true, role: true }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({ announcements })
  } catch (error) {
    console.error("Error fetching announcements:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, isPinned = false } = body

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    const announcement = await prisma.courseAnnouncement.create({
      data: {
        courseId: params.courseId,
        authorId: user.id,
        title: title.trim(),
        content: content.trim(),
        isPinned: Boolean(isPinned)
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true, role: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      announcement
    })
  } catch (error) {
    console.error("Error creating announcement:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}