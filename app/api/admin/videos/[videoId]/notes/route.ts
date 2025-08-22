// app/api/videos/[videoId]/notes/route.ts - Fixed version for existing schema
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

    // Check if note already exists for this user and video
    const existingNote = await prisma.videoNote.findFirst({
      where: {
        userId: user.id,
        videoId: params.videoId
      }
    })

    let videoNote

    if (existingNote) {
      // Update existing note
      videoNote = await prisma.videoNote.update({
        where: { id: existingNote.id },
        data: {
          content: content.trim(),
          ...(timestamp !== undefined && { timestamp }),
          updatedAt: new Date()
        }
      })
    } else {
      // Create new note
      videoNote = await prisma.videoNote.create({
        data: {
          userId: user.id,
          videoId: params.videoId,
          content: content.trim(),
          ...(timestamp !== undefined && { timestamp })
        }
      })
    }

    return NextResponse.json({
      success: true,
      note: videoNote,
      message: existingNote ? "Note updated successfully" : "Note created successfully"
    })
  } catch (error) {
    console.error("Error saving notes:", error)
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

    // For backward compatibility, if there's only one note, return its content
    // Otherwise return all notes
    if (notes.length === 1) {
      const note = notes[0]
      return NextResponse.json({ 
        content: note.content || '',
        timestamp: 'timestamp' in note ? note.timestamp : null,
        updatedAt: note.updatedAt
      })
    }

    return NextResponse.json({ 
      notes: notes.map(note => ({
        id: note.id,
        content: note.content,
        timestamp: 'timestamp' in note ? note.timestamp : null,
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