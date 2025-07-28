// app/api/courses/top-picks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get top courses based on enrollment count and ratings
    const topPickCourses = await prisma.course.findMany({
      where: {
        isPublished: true,
      },
      include: {
        videos: {
          select: {
            duration: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: [
        {
          enrollments: {
            _count: 'desc',
          },
        },
        {
          createdAt: 'desc',
        },
      ],
      take: 5, // Get top 5 courses
    })

    return NextResponse.json(topPickCourses)
  } catch (error) {
    console.error('Error fetching top pick courses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch top pick courses' },
      { status: 500 }
    )
  }
}
