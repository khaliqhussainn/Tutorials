// app/api/videos/[videoId]/access/route.ts - Updated for section-based access control
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
      return NextResponse.json({ canWatch: false })
    }

    // Determine if this video can be watched based on section structure
    let canWatch = false

    if (video.sectionId) {
      // Video is in a section
      const section = video.section!
      const sectionIndex = video.course.sections.findIndex((s: { id: any }) => s.id === section.id)
      const videoIndex = section.videos.findIndex((v: { id: string }) => v.id === video.id)

      if (sectionIndex === 0 && videoIndex === 0) {
        // First video of first section
        canWatch = true
      } else {
        // Check if previous video is completed
        let prevVideoId: string | null = null

        if (videoIndex > 0) {
          // Previous video in same section
          prevVideoId = section.videos[videoIndex - 1].id
        } else if (sectionIndex > 0) {
          // Last video of previous section
          const prevSection = video.course.sections[sectionIndex - 1]
          if (prevSection.videos.length > 0) {
            prevVideoId = prevSection.videos[prevSection.videos.length - 1].id
          }
        }

        if (prevVideoId) {
          const prevProgress = await prisma.videoProgress.findUnique({
            where: {
              userId_videoId: {
                userId: session.user.id,
                videoId: prevVideoId
              }
            }
          })
          canWatch = !!(prevProgress?.completed && prevProgress?.testPassed)
        }
      }
    } else {
      // Legacy video without section
      const videoIndex = video.course.videos.findIndex((v: { id: string }) => v.id === video.id)
      if (videoIndex === 0) {
        canWatch = true
      } else {
        const prevVideo = video.course.videos[videoIndex - 1]
        const prevProgress = await prisma.videoProgress.findUnique({
          where: {
            userId_videoId: {
              userId: session.user.id,
              videoId: prevVideo.id
            }
          }
        })
        canWatch = prevProgress?.completed && prevProgress?.testPassed
      }
    }

    // Get current video progress
    const progress = await prisma.videoProgress.findUnique({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId: params.videoId
        }
      }
    })

    return NextResponse.json({
      canWatch,
      completed: progress?.completed || false,
      testPassed: progress?.testPassed || false,
      watchTime: progress?.watchTime || 0
    })
  } catch (error) {
    console.error("Error checking video access:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}