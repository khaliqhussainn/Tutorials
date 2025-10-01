// app/api/admin/users/route.ts - Fixed
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

    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            enrollments: true,
          }
        },
        enrollments: {
          select: {
            progress: true,
            enrolledAt: true,
            course: {
              select: {
                videos: {
                  select: {
                    id: true,
                    duration: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate additional metrics for each user
    const enhancedUsers = users.map(user => {
      const totalEnrollments = user._count.enrollments
      const completedCourses = user.enrollments.filter(e => e.progress >= 100).length
      const averageProgress = totalEnrollments > 0 
        ? Math.round(user.enrollments.reduce((acc, e) => acc + e.progress, 0) / totalEnrollments)
        : 0
      
      // Calculate total watch time (approximate from progress and video durations)
      const totalWatchTime = user.enrollments.reduce((acc, enrollment) => {
        const courseDuration = enrollment.course.videos.reduce((sum, video) => sum + (video.duration || 0), 0)
        return acc + Math.round((courseDuration * enrollment.progress) / 100)
      }, 0)

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt, // Use updatedAt instead of lastLoginAt
        isActive: user.isActive ?? true,
        _count: {
          enrollments: totalEnrollments,
          completedCourses
        },
        totalWatchTime: Math.round(totalWatchTime / 60), // Convert to minutes
        averageProgress
      }
    })

    return NextResponse.json(enhancedUsers)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}