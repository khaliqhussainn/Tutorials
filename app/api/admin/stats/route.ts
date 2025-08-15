// app/api/admin/stats/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get comprehensive admin statistics
    const [
      totalUsers, 
      totalCourses, 
      totalVideos, 
      totalEnrollments, 
      publishedCourses,
      totalWatchTime,
      completedCourses,
      recentEnrollments,
      topCourses,
      userGrowth
    ] = await Promise.all([
      // Basic counts
      prisma.user.count(),
      prisma.course.count(),
      prisma.video.count(),
      prisma.enrollment.count(),
      
      // Published courses
      prisma.course.count({
        where: { isPublished: true }
      }),
      
      // Total watch time across all users
      prisma.videoProgress.aggregate({
        _sum: { watchTime: true }
      }),
      
      // Completed courses (100% progress)
      prisma.enrollment.count({
        where: { progress: 100 }
      }),
      
      // Recent enrollments (fixed orderBy field)
      prisma.enrollment.findMany({
        take: 10,
        orderBy: { enrolledAt: 'desc' }, // Changed from 'createdAt' to 'enrolledAt'
        include: {
          user: { select: { name: true, email: true, image: true } },
          course: { select: { title: true, category: true, thumbnail: true } }
        }
      }),
      
      // Top courses by enrollment
      prisma.course.findMany({
        take: 5,
        include: {
          _count: { select: { enrollments: true } },
          videos: { select: { id: true } }
        },
        orderBy: {
          enrollments: { _count: 'desc' }
        },
        where: { isPublished: true }
      }),
      
      // User growth over last 30 days
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ])

    // Calculate additional metrics
    const averageEnrollmentsPerCourse = totalCourses > 0 ? Math.round(totalEnrollments / totalCourses) : 0
    const courseCompletionRate = totalEnrollments > 0 ? Math.round((completedCourses / totalEnrollments) * 100) : 0
    const totalWatchTimeHours = Math.round((totalWatchTime._sum.watchTime || 0) / 3600)

    // Format recent enrollments for better display
    const formattedRecentEnrollments = recentEnrollments.map(enrollment => ({
      id: enrollment.id,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      progress: enrollment.progress,
      user: {
        name: enrollment.user.name || 'Unknown User',
        email: enrollment.user.email,
        image: enrollment.user.image
      },
      course: {
        title: enrollment.course.title,
        category: enrollment.course.category,
        thumbnail: enrollment.course.thumbnail
      }
    }))

    // Format top courses with additional stats
    const formattedTopCourses = topCourses.map(course => ({
      id: course.id,
      title: course.title,
      category: course.category,
      thumbnail: course.thumbnail,
      enrollmentCount: course._count.enrollments,
      videoCount: course.videos.length,
      level: course.level,
      rating: course.rating
    }))

    return NextResponse.json({
      // Basic stats
      totalUsers,
      totalCourses,
      publishedCourses,
      totalVideos,
      totalEnrollments,
      
      // Calculated metrics
      averageEnrollmentsPerCourse,
      courseCompletionRate,
      totalWatchTimeHours,
      userGrowth,
      
      // Detailed data
      recentEnrollments: formattedRecentEnrollments,
      topCourses: formattedTopCourses,
      
      // Additional insights
      insights: {
        unpublishedCourses: totalCourses - publishedCourses,
        averageVideosPerCourse: totalCourses > 0 ? Math.round(totalVideos / totalCourses) : 0,
        averageWatchTimePerUser: totalUsers > 0 ? Math.round(totalWatchTimeHours / totalUsers) : 0
      }
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}