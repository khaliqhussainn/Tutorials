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
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user ID from email since session.user.id might not be available
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    const { content, timestamp } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Verify video exists
    const video = await prisma.video.findUnique({
      where: { id: params.videoId }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Always create a new note (multiple notes per video per user)
    const videoNote = await prisma.videoNote.create({
      data: {
        userId: user.id,
        videoId: params.videoId,
        content: content.trim(),
        timestamp: timestamp !== undefined && timestamp !== null ? Math.floor(timestamp) : null
      }
    })

    return NextResponse.json({
      success: true,
      note: {
        id: videoNote.id,
        content: videoNote.content,
        timestamp: videoNote.timestamp,
        createdAt: videoNote.createdAt.toISOString(),
        updatedAt: videoNote.updatedAt.toISOString()
      },
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
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user ID from email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get all notes for this video by this user
    const notes = await prisma.videoNote.findMany({
      where: {
        userId: user.id,
        videoId: params.videoId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Return all notes in consistent format
    return NextResponse.json({ 
      notes: notes.map(note => ({
        id: note.id,
        content: note.content,
        timestamp: note.timestamp,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString()
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
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const url = new URL(request.url)
    const noteId = url.searchParams.get('noteId')

    if (noteId) {
      // Delete specific note
      const note = await prisma.videoNote.findFirst({
        where: {
          id: noteId,
          userId: user.id,
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
          userId: user.id,
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