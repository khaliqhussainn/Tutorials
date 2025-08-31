import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma' // Your existing prisma instance
import bcrypt from 'bcryptjs'
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, courseId } = req.query

  // Verify authorization
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.COURSE_WEBSITE_API_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    // Check if user completed the specific course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: userId as string,
          courseId: courseId as string
        }
      },
      include: {
        course: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!enrollment || !enrollment.completedAt) {
      return res.status(404).json({ message: 'Course not completed' })
    }

    // Get additional completion data
    const videoProgress = await prisma.videoProgress.findMany({
      where: {
        userId: userId as string,
        video: {
          courseId: courseId as string
        }
      },
      include: {
        video: true
      }
    })

    const completionProof = {
      user: enrollment.user,
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        category: enrollment.course.category
      },
      enrollment: {
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
        progress: enrollment.progress
      },
      videoProgress: videoProgress.map(vp => ({
        videoTitle: vp.video.title,
        completed: vp.completed,
        completedAt: vp.completedAt,
        watchTime: vp.watchTime
      })),
      totalVideos: videoProgress.length,
      completedVideos: videoProgress.filter(vp => vp.completed).length
    }

    res.status(200).json(completionProof)

  } catch (error) {
    console.error('Get course completion error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

