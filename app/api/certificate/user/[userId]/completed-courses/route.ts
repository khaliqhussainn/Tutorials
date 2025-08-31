// app/api/certificate/user/[userId]/completed-courses/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  const authHeader = request.headers.get('authorization');

  // Verify authorization
  if (authHeader !== `Bearer ${process.env.COURSE_WEBSITE_API_SECRET}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get completed courses for the user
    const completedEnrollments = await prisma.enrollment.findMany({
      where: {
        userId: userId,
        completedAt: { not: null },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnail: true,
            category: true,
            level: true,
          },
        },
      },
    });

    const completedCourses = completedEnrollments.map((enrollment) => ({
      id: enrollment.course.id,
      title: enrollment.course.title,
      description: enrollment.course.description,
      thumbnail: enrollment.course.thumbnail,
      category: enrollment.course.category,
      level: enrollment.course.level,
      completedAt: enrollment.completedAt,
    }));

    return NextResponse.json(completedCourses);
  } catch (error) {
    console.error('Get completed courses error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
