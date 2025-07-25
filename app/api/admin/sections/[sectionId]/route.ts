// app/api/admin/sections/[sectionId]/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: Request,
  { params }: { params: { sectionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Move videos in this section to uncategorized (remove sectionId)
    await prisma.video.updateMany({
      where: { sectionId: params.sectionId },
      data: { sectionId: null }
    })

    // Delete the section
    await prisma.courseSection.delete({
      where: { id: params.sectionId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting section:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { sectionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()
    
    const section = await prisma.courseSection.update({
      where: { id: params.sectionId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.order !== undefined && { order: data.order }),
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
    console.error("Error updating section:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}