// lib/notifications.ts
import { prisma } from '@/lib/prisma'

export type NotificationType = 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR'

export interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  type?: NotificationType
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, any>
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'INFO',
        actionUrl: params.actionUrl,
        actionLabel: params.actionLabel,
        metadata: params.metadata
      }
    })
    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

export async function createBulkNotifications(notifications: CreateNotificationParams[]) {
  try {
    const result = await prisma.notification.createMany({
      data: notifications.map(n => ({
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type || 'INFO',
        actionUrl: n.actionUrl,
        actionLabel: n.actionLabel,
        metadata: n.metadata
      }))
    })
    return result
  } catch (error) {
    console.error('Error creating bulk notifications:', error)
    throw error
  }
}

// Pre-defined notification templates
export const NotificationTemplates = {
  courseEnrollment: (courseName: string, courseId: string) => ({
    title: 'Welcome to your new course! 🎉',
    message: `You've successfully enrolled in "${courseName}". Start your learning journey now!`,
    type: 'SUCCESS' as NotificationType,
    actionUrl: `/course/${courseId}`,
    actionLabel: 'Start Learning'
  }),

  videoCompleted: (videoTitle: string, courseName: string, courseId: string) => ({
    title: 'Lesson Completed! ✅',
    message: `Great job completing "${videoTitle}" in ${courseName}`,
    type: 'SUCCESS' as NotificationType,
    actionUrl: `/course/${courseId}`,
    actionLabel: 'Continue Course'
  }),

  courseCompleted: (courseName: string, courseId: string) => ({
    title: 'Course Completed! 🏆',
    message: `Congratulations! You've completed "${courseName}". Check out similar courses to continue learning.`,
    type: 'SUCCESS' as NotificationType,
    actionUrl: `/course/${courseId}/certificate`,
    actionLabel: 'View Certificate'
  }),

  learningStreak: (days: number) => ({
    title: `${days} Day Learning Streak! 🔥`,
    message: `Amazing! You've been learning consistently for ${days} days. Keep it up!`,
    type: 'SUCCESS' as NotificationType,
    actionUrl: '/dashboard',
    actionLabel: 'View Progress'
  }),

  weeklyGoalReached: (completedLessons: number) => ({
    title: 'Weekly Goal Achieved! 🎯',
    message: `You've completed ${completedLessons} lessons this week. Excellent progress!`,
    type: 'SUCCESS' as NotificationType,
    actionUrl: '/dashboard',
    actionLabel: 'View Stats'
  }),

  newCourseRecommendation: (courseName: string, courseId: string, reason: string) => ({
    title: 'New Course Recommendation 💡',
    message: `Based on ${reason}, we recommend "${courseName}" for you`,
    type: 'INFO' as NotificationType,
    actionUrl: `/course/${courseId}`,
    actionLabel: 'View Course'
  }),

  inactivityReminder: (daysSince: number) => ({
    title: 'We miss you! 📚',
    message: `It's been ${daysSince} days since your last lesson. Ready to continue learning?`,
    type: 'WARNING' as NotificationType,
    actionUrl: '/courses',
    actionLabel: 'Browse Courses'
  }),

  courseUpdate: (courseName: string, courseId: string, updateType: string) => ({
    title: 'Course Updated! 🆕',
    message: `"${courseName}" has new ${updateType}. Check it out!`,
    type: 'INFO' as NotificationType,
    actionUrl: `/course/${courseId}`,
    actionLabel: 'View Updates'
  }),

  favoriteAdded: (courseName: string, courseId: string) => ({
    title: 'Course Added to Favorites ❤️',
    message: `"${courseName}" has been added to your favorites`,
    type: 'INFO' as NotificationType,
    actionUrl: `/course/${courseId}`,
    actionLabel: 'View Course'
  }),

  certificateEarned: (courseName: string, courseId: string) => ({
    title: 'Certificate Earned! 🏅',
    message: `You've earned a certificate for completing "${courseName}"`,
    type: 'SUCCESS' as NotificationType,
    actionUrl: `/course/${courseId}/certificate`,
    actionLabel: 'Download Certificate'
  })
}

// Helper function to send notification after course enrollment
export async function notifyOnEnrollment(userId: string, courseName: string, courseId: string) {
  const template = NotificationTemplates.courseEnrollment(courseName, courseId)
  return createNotification({
    userId,
    ...template,
    metadata: { courseId, event: 'enrollment' }
  })
}

// Helper function to send notification after video completion
export async function notifyOnVideoCompletion(
  userId: string, 
  videoTitle: string, 
  courseName: string, 
  courseId: string
) {
  const template = NotificationTemplates.videoCompleted(videoTitle, courseName, courseId)
  return createNotification({
    userId,
    ...template,
    metadata: { courseId, videoTitle, event: 'video_completed' }
  })
}

// Helper function to send notification after course completion
export async function notifyOnCourseCompletion(userId: string, courseName: string, courseId: string) {
  const template = NotificationTemplates.courseCompleted(courseName, courseId)
  return createNotification({
    userId,
    ...template,
    metadata: { courseId, event: 'course_completed' }
  })
}

// Function to check and create learning streak notifications
export async function checkLearningStreak(userId: string) {
  try {
    // Get user's video completions for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const completions = await prisma.videoProgress.findMany({
      where: {
        userId,
        completed: true,
        completedAt: { gte: thirtyDaysAgo }
      },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true }
    })

    if (completions.length === 0) return

    // Calculate consecutive days
    let streak = 0
    let currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    for (let i = 0; i < 30; i++) {
      const dayStart = new Date(currentDate)
      const dayEnd = new Date(currentDate)
      dayEnd.setHours(23, 59, 59, 999)

      const hasActivityThisDay = completions.some(completion => {
        const completionDate = new Date(completion.completedAt!)
        return completionDate >= dayStart && completionDate <= dayEnd
      })

      if (hasActivityThisDay) {
        streak++
      } else if (streak > 0) {
        break // Streak is broken
      }

      currentDate.setDate(currentDate.getDate() - 1)
    }

    // Send notification for significant streaks
    if (streak > 0 && [3, 7, 14, 30].includes(streak)) {
      const template = NotificationTemplates.learningStreak(streak)
      await createNotification({
        userId,
        ...template,
        metadata: { streak, event: 'learning_streak' }
      })
    }
  } catch (error) {
    console.error('Error checking learning streak:', error)
  }
}

// Function to send weekly goal notifications
export async function checkWeeklyGoals(userId: string) {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const weeklyCompletions = await prisma.videoProgress.count({
      where: {
        userId,
        completed: true,
        completedAt: { gte: weekAgo }
      }
    })

    // Send notification if user completed 5+ lessons this week
    if (weeklyCompletions >= 5) {
      const template = NotificationTemplates.weeklyGoalReached(weeklyCompletions)
      await createNotification({
        userId,
        ...template,
        metadata: { weeklyCompletions, event: 'weekly_goal' }
      })
    }
  } catch (error) {
    console.error('Error checking weekly goals:', error)
  }
}