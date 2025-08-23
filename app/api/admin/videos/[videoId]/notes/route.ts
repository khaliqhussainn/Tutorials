// app/api/videos/[videoId]/notes/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { content, timestamp } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Verify video exists and user has access
    const video = await prisma.video.findUnique({
      where: { id: params.videoId },
      include: {
        course: {
          select: {
            enrollments: {
              where: { userId: session.user.id },
              select: { id: true }
            }
          }
        }
      }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    const isEnrolled = video.course.enrollments.length > 0
    const isAdmin = session.user.role === 'ADMIN'

    if (!isEnrolled && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Create new note
    const videoNote = await prisma.videoNote.create({
      data: {
        userId: session.user.id,
        videoId: params.videoId,
        content: content.trim(),
        timestamp: timestamp || null
      }
    })

    return NextResponse.json({
      success: true,
      note: videoNote,
      message: "Note created successfully"
    })
  } catch (error) {
    console.error("Error saving note:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all notes for this video by this user
    const notes = await prisma.videoNote.findMany({
      where: {
        userId: session.user.id,
        videoId: params.videoId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ 
      notes: notes.map(note => ({
        id: note.id,
        content: note.content,
        timestamp: note.timestamp,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      })),
      count: notes.length
    })
  } catch (error) {
    console.error("Error fetching notes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const noteId = url.searchParams.get('noteId')

    if (noteId) {
      // Delete specific note
      const note = await prisma.videoNote.findFirst({
        where: {
          id: noteId,
          userId: session.user.id,
          videoId: params.videoId
        }
      })

      if (!note) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 })
      }

      await prisma.videoNote.delete({
        where: { id: noteId }
      })

      return NextResponse.json({ 
        success: true, 
        message: "Note deleted successfully" 
      })
    } else {
      // Delete all notes for this video by this user
      const deleteResult = await prisma.videoNote.deleteMany({
        where: {
          userId: session.user.id,
          videoId: params.videoId
        }
      })

      return NextResponse.json({ 
        success: true, 
        message: `${deleteResult.count} note(s) deleted successfully`,
        deletedCount: deleteResult.count
      })
    }
  } catch (error) {
    console.error("Error deleting notes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}