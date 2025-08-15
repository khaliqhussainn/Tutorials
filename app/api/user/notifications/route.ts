// app/api/user/notifications/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's recent activity to generate notifications
    const [recentEnrollments, recentProgress, upcomingDeadlines] = await Promise.all([
      // Recent enrollments for welcome notifications
      prisma.enrollment.findMany({
        where: {
          userId: user.id,
          enrolledAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        include: {
          course: { select: { title: true, category: true } }
        },
        orderBy: { enrolledAt: 'desc' },
        take: 3
      }),

      // Recent progress for encouragement notifications
      prisma.videoProgress.findMany({
        where: {
          userId: user.id,
          completed: true,
          completedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        include: {
          video: {
            include: {
              course: { select: { id: true, title: true } }
            }
          }
        },
        orderBy: { completedAt: 'desc' },
        take: 2
      }),

      // Mock upcoming deadlines - in production, you'd have actual assignment deadlines
      prisma.enrollment.findMany({
        where: { userId: user.id },
        include: {
          course: { 
            select: { title: true, category: true },
            include: {
              videos: { select: { id: true } }
            }
          }
        },
        take: 2
      })
    ])

    // Generate notifications based on user activity
    const notifications = [
      // Progress notifications
      ...recentProgress.map((progress, index) => ({
        id: `progress_${progress.id}`,
        title: 'Great Progress! 🎉',
        message: `You completed "${progress.video.title}" in ${progress.video.course.title}`,
        type: 'success' as const,
        read: false,
        createdAt: progress.completedAt || progress.updatedAt,
        action: {
          label: 'Continue Learning',
          url: `/course/${progress.video.course.id}`
        }
      })),

      // New enrollment notifications
      ...recentEnrollments.map((enrollment, index) => ({
        id: `enrollment_${enrollment.id}`,
        title: 'Welcome to your new course! 👋',
        message: `You've enrolled in "${enrollment.course.title}". Ready to start learning?`,
        type: 'info' as const,
        read: index > 0, // Mark first as unread
        createdAt: enrollment.enrolledAt,
        action: {
          label: 'Start Course',
          url: `/course/${enrollment.courseId}`
        }
      })),

      // Encouragement notifications for inactive users
      ...(recentProgress.length === 0 ? [{
        id: 'encouragement_1',
        title: 'Missing your learning streak? 📚',
        message: 'Complete a lesson today to keep your momentum going!',
        type: 'warning' as const,
        read: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        action: {
          label: 'Browse Courses',
          url: '/courses'
        }
      }] : []),

      // Course recommendation notifications
      {
        id: 'recommendation_1',
        title: 'New Course Recommendation 💡',
        message: 'Based on your interests, you might like "Advanced React Patterns"',
        type: 'info' as const,
        read: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        action: {
          label: 'View Course',
          url: '/courses'
        }
      }
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10) // Limit to 10 notifications

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notificationIds, markAsRead } = await request.json()

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 })
    }

    // In a real application, you would update notification read status in database
    // For now, just return success
    return NextResponse.json({ 
      success: true, 
      message: `Marked ${notificationIds.length} notifications as ${markAsRead ? 'read' : 'unread'}` 
    })
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}