// app/api/admin/videos/route.ts - FIXED to properly handle video creation with duration
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { 
      title, 
      description, 
      videoUrl, 
      duration, // This should come from the upload response
      courseId, 
      sectionId, 
      order 
    } = await request.json()

    console.log('Creating video with data:', {
      title,
      videoUrl,
      duration,
      courseId,
      sectionId,
      order
    })

    // Validate required fields
    if (!title || !videoUrl || !courseId) {
      return NextResponse.json({ 
        error: "Missing required fields: title, videoUrl, courseId" 
      }, { status: 400 })
    }

    // Ensure duration is a valid number
    const videoDuration = duration && !isNaN(duration) ? Math.round(Number(duration)) : null

    console.log('Processed duration:', videoDuration)

    const video = await prisma.video.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        videoUrl,
        duration: videoDuration, // Store duration in seconds as integer
        courseId,
        sectionId: sectionId || null,
        order: order || 1
      },
      include: {
        tests: true,
        course: {
          select: {
            title: true
          }
        },
        section: {
          select: {
            title: true
          }
        }
      }
    })

    console.log('Video created successfully:', {
      id: video.id,
      title: video.title,
      duration: video.duration,
      videoUrl: video.videoUrl
    })

    return NextResponse.json(video)
  } catch (error) {
    console.error("Error creating video:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const videos = await prisma.video.findMany({
      include: {
        course: {
          select: {
            title: true
          }
        },
        section: {
          select: {
            title: true
          }
        },
        tests: {
          select: {
            id: true
          }
        },
        _count: {
          select: {
            progress: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(videos)
  } catch (error) {
    console.error("Error fetching videos:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}