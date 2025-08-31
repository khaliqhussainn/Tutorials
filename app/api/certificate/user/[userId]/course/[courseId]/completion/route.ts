import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { userId: string; courseId: string } }
) {
  const { userId, courseId } = params;
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.COURSE_WEBSITE_API_SECRET}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      include: {
        course: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!enrollment || !enrollment.completedAt) {
      return NextResponse.json(
        { message: 'Course not completed' },
        { status: 404 }
      );
    }

    const videoProgress = await prisma.videoProgress.findMany({
      where: {
        userId,
        video: {
          courseId,
        },
      },
      include: {
        video: true,
      },
    });

    const completionProof = {
      user: enrollment.user,
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        category: enrollment.course.category,
      },
      enrollment: {
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
        progress: enrollment.progress,
      },
      videoProgress: videoProgress.map((vp) => ({
        videoTitle: vp.video.title,
        completed: vp.completed,
        completedAt: vp.completedAt,
        watchTime: vp.watchTime,
      })),
      totalVideos: videoProgress.length,
      completedVideos: videoProgress.filter((vp) => vp.completed).length,
    };

    return NextResponse.json(completionProof);
  } catch (error) {
    console.error('Get course completion error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
