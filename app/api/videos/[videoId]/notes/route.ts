// app/api/videos/[videoId]/notes/route.ts - For saving video notes
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
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { notes } = await request.json()

    const videoNote = await prisma.videoNote.upsert({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId: params.videoId
        }
      },
      update: {
        content: notes
      },
      create: {
        userId: session.user.id,
        videoId: params.videoId,
        content: notes
      }
    })

    return NextResponse.json(videoNote)
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
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notes = await prisma.videoNote.findUnique({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId: params.videoId
        }
      }
    })

    return NextResponse.json({ content: notes?.content || '' })
  } catch (error) {
    console.error("Error fetching notes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}