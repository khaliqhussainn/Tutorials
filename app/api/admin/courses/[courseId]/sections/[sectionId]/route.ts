// app/api/admin/sections/[sectionId]/route.ts - FIXED
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

    // Get section with videos
    const section = await prisma.courseSection.findUnique({
      where: { id: params.sectionId },
      include: {
        videos: { select: { id: true } },
        course: { select: { id: true, title: true } }
      }
    })

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 })
    }

    // Move all videos in this section to be uncategorized (remove sectionId)
    if (section.videos.length > 0) {
      await prisma.video.updateMany({
        where: { sectionId: params.sectionId },
        data: { sectionId: null }
      })
    }

    // Delete the section
    await prisma.courseSection.delete({
      where: { id: params.sectionId }
    })

    return NextResponse.json({ 
      success: true, 
      message: `Section deleted successfully. ${section.videos.length} videos moved to uncategorized.` 
    })
  } catch (error) {
    console.error("Error deleting section:", error)
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 })
  }
}