// app/api/admin/videos/[videoId]/route.ts

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

export async function DELETE(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { videoId } = params

    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        tests: true,
        transcript: true
      }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Delete the video (cascading deletes will handle related records)
    await prisma.video.delete({
      where: { id: videoId }
    })

    console.log(`Video "${video.title}" deleted by admin ${session.user.email}`)

    return NextResponse.json({ 
      success: true, 
      message: "Video deleted successfully" 
    })
  } catch (error) {
    console.error("Error deleting video:", error)
    return NextResponse.json(
      { error: "Failed to delete video" }, 
      { status: 500 }
    )
  }
}

// Optional: Add GET and PATCH for individual video operations
export async function GET(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const video = await prisma.video.findUnique({
      where: { id: params.videoId },
      include: {
        tests: {
          orderBy: { order: 'asc' }
        },
        transcript: true,
        course: {
          select: { id: true, title: true }
        },
        section: {
          select: { id: true, title: true }
        }
      }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error("Error fetching video:", error)
    return NextResponse.json(
      { error: "Failed to fetch video" }, 
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()
    
    const video = await prisma.video.update({
      where: { id: params.videoId },
      data: {
        title: data.title,
        description: data.description,
        videoUrl: data.videoUrl,
        duration: data.duration ? Math.round(data.duration) : null,
        aiPrompt: data.aiPrompt,
        order: data.order
      },
      include: {
        tests: true,
        transcript: true
      }
    })

    console.log(`Video "${video.title}" updated by admin ${session.user.email}`)

    return NextResponse.json(video)
  } catch (error) {
    console.error("Error updating video:", error)
    return NextResponse.json(
      { error: "Failed to update video" }, 
      { status: 500 }
    )
  }
}