// app/api/admin/enrollments/route.ts - FIXED VERSION
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // First, get basic enrollment data
    const enrollments = await prisma.enrollment.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        course: {
          select: {
            id: true,
            title: true,
            category: true,
            level: true,
            thumbnail: true,
            _count: {
              select: {
                videos: true
              }
            }
          }
        }
      },
      orderBy: { enrolledAt: 'desc' }
    })

    // Enhanced enrollments with calculated metrics
    const enhancedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        // Get completed videos count for this specific course
        const completedVideos = await prisma.videoProgress.count({
          where: {
            userId: enrollment.userId,
            completed: true,
            video: {
              courseId: enrollment.courseId
            }
          }
        })

        // Get total watch time for this course
        const watchTimeData = await prisma.videoProgress.aggregate({
          where: {
            userId: enrollment.userId,
            video: {
              courseId: enrollment.courseId
            }
          },
          _sum: {
            watchTime: true
          }
        })

        // Get last access time
        const lastAccess = await prisma.videoProgress.findFirst({
          where: {
            userId: enrollment.userId,
            video: {
              courseId: enrollment.courseId
            }
          },
          orderBy: {
            updatedAt: 'desc'
          },
          select: {
            updatedAt: true
          }
        })

        return {
          ...enrollment,
          _count: {
            completedVideos
          },
          totalWatchTime: Math.round((watchTimeData._sum.watchTime || 0) / 60), // Convert to minutes
          lastAccessedAt: lastAccess?.updatedAt?.toISOString() || null
        }
      })
    )

    return NextResponse.json(enhancedEnrollments)
  } catch (error) {
    console.error("Error fetching enrollments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
