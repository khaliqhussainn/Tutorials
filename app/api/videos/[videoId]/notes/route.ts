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
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { notes } = await request.json()

    // For now, we'll store notes in the VideoProgress table
    // In a production app, you might want a separate Notes table
    const progress = await prisma.videoProgress.upsert({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId: params.videoId
        }
      },
      update: {
        // Add notes field to your schema if needed
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        videoId: params.videoId,
        completed: false,
        watchTime: 0
      }
    })

    return NextResponse.json({ success: true })
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

    // Return notes (placeholder for now)
    return NextResponse.json({ notes: "" })
  } catch (error) {
    console.error("Error fetching notes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
