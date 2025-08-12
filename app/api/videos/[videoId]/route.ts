// app/api/videos/[videoId]/route.ts - FIXED to include duration properly
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const video = await prisma.video.findUnique({
      where: { id: params.videoId },
      include: {
        tests: {
          select: {
            id: true,
            question: true,
            options: true,
            correct: true,
            explanation: true
          }
        },
        course: {
          select: {
            id: true,
            title: true
          }
        },
        section: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error("Error fetching video:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
