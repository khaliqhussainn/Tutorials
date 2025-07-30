// app/api/progress/quiz/route.ts - Handle quiz submissions
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse videoId from request body
    const { videoId } = await request.json();

    // Get video with course information
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        course: {
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: {
                videos: {
                  orderBy: { order: 'asc' },
                  select: { id: true, order: true }
                }
              }
            },
            videos: {
              where: { sectionId: null },
              orderBy: { order: 'asc' },
              select: { id: true, order: true }
            }
          }
        },
        section: true
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
      return NextResponse.json({ 
        canWatch: false, 
        reason: "Not enrolled in course" 
      })
    }

    // Get user's progress for this video
    const progress = await prisma.videoProgress.findUnique({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId: videoId
        }
      }
    })

    // Get user's notes
    const notes = await prisma.videoNote.findUnique({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId: videoId
        }
      }
    })

    // Check if this is the first video or if previous video is completed
    let canWatch = false
    
    // Find video position in course
    let allVideos: any[] = []
    if (video.course.sections) {
      for (const section of video.course.sections) {
        allVideos.push(...section.videos)
      }
    }
    if (video.course.videos) {
      allVideos.push(...video.course.videos)
    }
    
    // Sort by order
    allVideos.sort((a, b) => a.order - b.order)
    
    const currentVideoIndex = allVideos.findIndex(v => v.id === video.id)
    
    if (currentVideoIndex === 0) {
      // First video is always accessible
      canWatch = true
    } else {
      // Check if previous video is completed with test passed
      const previousVideo = allVideos[currentVideoIndex - 1]
      
      const previousProgress = await prisma.videoProgress.findUnique({
        where: {
          userId_videoId: {
            userId: session.user.id,
            videoId: previousVideo.id
          }
        }
      })

      // Get previous video to check if it has tests
      const prevVideoData = await prisma.video.findUnique({
        where: { id: previousVideo.id },
        include: { tests: { select: { id: true } } }
      })

      // Can watch if previous video is completed and either has no tests or test is passed
      canWatch = !!previousProgress?.completed && 
                 (prevVideoData?.tests.length === 0 || !!previousProgress?.testPassed)
    }

    return NextResponse.json({
      canWatch,
      progress: {
        completed: progress?.completed || false,
        testPassed: progress?.testPassed || false,
        watchTime: progress?.watchTime || 0,
        testScore: progress?.testScore || null,
        testAttempts: progress?.testAttempts || 0
      },
      notes: notes?.content || '',
      videoPosition: {
        current: currentVideoIndex + 1,
        total: allVideos.length
      }
    })
  } catch (error) {
    console.error("Error checking video access:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
