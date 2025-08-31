import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma' // Your existing prisma instance
import bcrypt from 'bcryptjs'
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query

  // Verify authorization
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.COURSE_WEBSITE_API_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    // Get completed courses for the user
    const completedEnrollments = await prisma.enrollment.findMany({
      where: {
        userId: userId as string,
        completedAt: { not: null }
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnail: true,
            category: true,
            level: true
          }
        }
      }
    })

    const completedCourses = completedEnrollments.map(enrollment => ({
      id: enrollment.course.id,
      title: enrollment.course.title,
      description: enrollment.course.description,
      thumbnail: enrollment.course.thumbnail,
      category: enrollment.course.category,
      level: enrollment.course.level,
      completedAt: enrollment.completedAt
    }))

    res.status(200).json(completedCourses)

  } catch (error) {
    console.error('Get completed courses error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}