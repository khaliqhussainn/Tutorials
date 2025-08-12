// app/api/videos/[videoId]/access/route.ts - FIXED with proper duration handling
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

    // Get the video details with all related data
    const video = await prisma.video.findUnique({
      where: { id: params.videoId },
      include: {
        course: {
          include: {
            sections: {
              include: {
                videos: {
                  orderBy: { order: 'asc' },
                  include: {
                    tests: {
                      select: {
                        id: true
                      }
                    }
                  }
                }
              },
              orderBy: { order: 'asc' }
            },
            videos: {
              where: { sectionId: null },
              orderBy: { order: 'asc' },
              include: {
                tests: {
                  select: {
                    id: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Check if user is enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: video.courseId
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ canWatch: false, reason: "Not enrolled" })
    }

    // Get all videos in order (both sectioned and legacy)
    const allVideos = []
    
    // Add sectioned videos
    for (const section of video.course.sections) {
      for (const sectionVideo of section.videos) {
        allVideos.push({
          ...sectionVideo,
          hasTests: sectionVideo.tests.length > 0
        })
      }
    }
    
    // Add legacy videos (videos without sections)
    allVideos.push(...video.course.videos.map(v => ({
      ...v,
      hasTests: v.tests.length > 0
    })))
    
    // Sort by global order
    allVideos.sort((a, b) => a.order - b.order)
    
    // Find current video position
    const currentVideoIndex = allVideos.findIndex(v => v.id === video.id)
    
    if (currentVideoIndex === 0) {
      // First video is always accessible
      return NextResponse.json({ canWatch: true })
    }

    // Get all previous video progress
    const previousVideoIds = allVideos.slice(0, currentVideoIndex).map(v => v.id)
    const progressRecords = await prisma.videoProgress.findMany({
      where: {
        userId: session.user.id,
        videoId: {
          in: previousVideoIds
        }
      }
    })

    // Check all previous videos
    for (let i = 0; i < currentVideoIndex; i++) {
      const prevVideo = allVideos[i]
      
      const prevProgress = progressRecords.find(p => p.videoId === prevVideo.id)

      if (!prevProgress?.completed) {
        return NextResponse.json({ 
          canWatch: false, 
          reason: "Previous video not completed",
          requiredVideo: prevVideo.title
        })
      }

      // If previous video has tests, check if passed
      if (prevVideo.hasTests && !prevProgress.testPassed) {
        return NextResponse.json({ 
          canWatch: false, 
          reason: "Previous video quiz not passed",
          requiredVideo: prevVideo.title
        })
      }
    }

    return NextResponse.json({ canWatch: true })
  } catch (error) {
    console.error("Error checking video access:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
