// app/api/user/notifications/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

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

    // Get stored notifications from database
    const storedNotifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        read: true,
        createdAt: true,
        actionUrl: true,
        actionLabel: true,
        metadata: true,
        userId: true
      }
    })

    // Get user's recent activity to generate dynamic notifications
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

      // Get courses with incomplete progress for motivation
      prisma.enrollment.findMany({
        where: { 
          userId: user.id,
          // Only get enrollments from the last 30 days to avoid old courses
          enrolledAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          course: { 
            select: { 
              id: true, 
              title: true, 
              category: true,
              _count: {
                select: { videos: true }
              }
            }
          }
        },
        take: 3
      })
    ])

    // Generate dynamic notifications based on user activity
    const dynamicNotifications = []

    // Progress notifications (last 24 hours)
    recentProgress.forEach((progress, index) => {
      dynamicNotifications.push({
        id: `progress_${progress.id}`,
        title: 'Great Progress! 🎉',
        message: `You completed "${progress.video.title}" in ${progress.video.course.title}`,
        type: 'SUCCESS' as const,
        read: false,
        createdAt: progress.completedAt || progress.updatedAt,
        action: {
          label: 'Continue Learning',
          url: `/course/${progress.video.course.id}`
        }
      })
    })

    // New enrollment notifications (last 7 days)
    recentEnrollments.forEach((enrollment, index) => {
      dynamicNotifications.push({
        id: `enrollment_${enrollment.id}`,
        title: 'Welcome to your new course! 👋',
        message: `You've enrolled in "${enrollment.course.title}". Ready to start learning?`,
        type: 'INFO' as const,
        read: index > 0, // Mark first as unread
        createdAt: enrollment.enrolledAt,
        action: {
          label: 'Start Course',
          url: `/course/${enrollment.courseId}`
        }
      })
    })

    // Encouragement notifications for inactive users
    const lastActivityTime = Math.max(
      ...recentProgress.map(p => new Date(p.completedAt || p.updatedAt).getTime()),
      ...recentEnrollments.map(e => new Date(e.enrolledAt).getTime()),
      0
    )
    
    const timeSinceLastActivity = Date.now() - lastActivityTime
    const daysSinceActivity = Math.floor(timeSinceLastActivity / (24 * 60 * 60 * 1000))

    if (daysSinceActivity > 2 && recentProgress.length === 0) {
      dynamicNotifications.push({
        id: 'encouragement_1',
        title: 'Missing your learning streak? 📚',
        message: `It's been ${daysSinceActivity} days since your last lesson. Keep your momentum going!`,
        type: 'WARNING' as const,
        read: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        action: {
          label: 'Browse Courses',
          url: '/courses'
        }
      })
    }

    // Course completion encouragement
    for (const enrollment of upcomingDeadlines) {
      const courseProgress = await prisma.videoProgress.count({
        where: {
          userId: user.id,
          video: {
            courseId: enrollment.courseId
          },
          completed: true
        }
      })

      const totalVideos = enrollment.course._count.videos
      const progressPercentage = totalVideos > 0 ? (courseProgress / totalVideos) * 100 : 0

      if (progressPercentage > 20 && progressPercentage < 80) {
        dynamicNotifications.push({
          id: `progress_reminder_${enrollment.courseId}`,
          title: `You're ${Math.round(progressPercentage)}% through ${enrollment.course.title}! 🚀`,
          message: 'Keep going! You\'re making great progress.',
          type: 'INFO' as const,
          read: true, // Mark as read to avoid spam
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
          action: {
            label: 'Continue Course',
            url: `/course/${enrollment.courseId}`
          }
        })
      }
    }

    // Course recommendation notifications
    const userCategories = Array.from(new Set(recentEnrollments.map(e => e.course.category)))
    if (userCategories.length > 0) {
      const recommendedCourses = await prisma.course.findMany({
        where: {
          category: { in: userCategories },
          isPublished: true,
          NOT: {
            enrollments: {
              some: { userId: user.id }
            }
          }
        },
        orderBy: { enrollments: { _count: 'desc' } },
        take: 1,
        select: { id: true, title: true, category: true }
      })

      if (recommendedCourses.length > 0) {
        const course = recommendedCourses[0]
        dynamicNotifications.push({
          id: `recommendation_${course.id}`,
          title: 'New Course Recommendation 💡',
          message: `Based on your interests in ${course.category}, you might like "${course.title}"`,
          type: 'INFO' as const,
          read: Math.random() > 0.5, // Randomly mark some as read
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          action: {
            label: 'View Course',
            url: `/course/${course.id}`
          }
        })
      }
    }

    // Combine stored and dynamic notifications
    const allNotifications = [
      // Convert stored notifications to the expected format
      ...storedNotifications.map(notification => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type.toLowerCase(),
        read: notification.read,
        createdAt: notification.createdAt.toISOString(),
        action: notification.actionUrl ? {
          label: notification.actionLabel || 'View',
          url: notification.actionUrl
        } : undefined
      })),
      // Add dynamic notifications
      ...dynamicNotifications
    ]

    // Sort by creation date and limit to 15
    const sortedNotifications = allNotifications
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 15)

    return NextResponse.json(sortedNotifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
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

    const { title, message, type, actionUrl, actionLabel, metadata } = await request.json()

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
    }

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        title,
        message,
        type: type || 'INFO',
        actionUrl,
        actionLabel,
        metadata
      }
    })

    return NextResponse.json({
      success: true,
      notification: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type.toLowerCase(),
        read: notification.read,
        createdAt: notification.createdAt.toISOString(),
        action: notification.actionUrl ? {
          label: notification.actionLabel || 'View',
          url: notification.actionUrl
        } : undefined
      }
    })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
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

    const { notificationIds, markAsRead } = await request.json()

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 })
    }

    // Filter to only update stored notifications (those with proper UUIDs)
    const storedNotificationIds = notificationIds.filter(id => 
      typeof id === 'string' && !id.startsWith('progress_') && 
      !id.startsWith('enrollment_') && !id.startsWith('encouragement_') &&
      !id.startsWith('recommendation_') && !id.startsWith('progress_reminder_')
    )

    if (storedNotificationIds.length > 0) {
      await prisma.notification.updateMany({
        where: {
          id: { in: storedNotificationIds },
          userId: user.id
        },
        data: {
          read: markAsRead
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Marked ${notificationIds.length} notifications as ${markAsRead ? 'read' : 'unread'}`,
      updatedCount: storedNotificationIds.length
    })
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
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

    const { notificationIds } = await request.json()

    if (notificationIds && Array.isArray(notificationIds)) {
      // Delete specific notifications
      const storedNotificationIds = notificationIds.filter(id => 
        typeof id === 'string' && !id.startsWith('progress_') && 
        !id.startsWith('enrollment_') && !id.startsWith('encouragement_') &&
        !id.startsWith('recommendation_') && !id.startsWith('progress_reminder_')
      )

      if (storedNotificationIds.length > 0) {
        await prisma.notification.deleteMany({
          where: {
            id: { in: storedNotificationIds },
            userId: user.id
          }
        })
      }

      return NextResponse.json({ 
        success: true, 
        message: `Deleted ${storedNotificationIds.length} notifications`
      })
    } else {
      // Delete all notifications for user
      await prisma.notification.deleteMany({
        where: { userId: user.id }
      })

      return NextResponse.json({ 
        success: true, 
        message: 'All notifications deleted'
      })
    }
  } catch (error) {
    console.error('Error deleting notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}