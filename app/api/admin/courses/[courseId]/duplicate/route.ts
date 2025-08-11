import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the original course with all its content
    const originalCourse = await prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            videos: {
              orderBy: { order: "asc" },
              include: {
                tests: true,
              },
            },
          },
        },
        videos: {
          where: { sectionId: null },
          orderBy: { order: "asc" },
          include: {
            tests: true,
          },
        },
      },
    });

    if (!originalCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Create duplicate course in a transaction
    const duplicatedCourse = await prisma.$transaction(async (tx) => {
      // First, create the course
      const newCourse = await tx.course.create({
        data: {
          title: `${originalCourse.title} (Copy)`,
          description: originalCourse.description,
          thumbnail: originalCourse.thumbnail,
          category: originalCourse.category,
          level: originalCourse.level,
          isPublished: false, // Always create as draft
        },
      });

      // Then create sections with their videos
      for (const section of originalCourse.sections) {
       // Assuming your model is named `CourseSection` in the schema
const newSection = await tx.courseSection.create({
  data: {
    title: section.title,
    description: section.description,
    order: section.order,
    courseId: newCourse.id,
  },
});



        // Create videos for this section
        for (const video of section.videos) {
          const newVideo = await tx.video.create({
            data: {
              title: video.title,
              description: video.description,
              videoUrl: video.videoUrl,
              duration: video.duration,
              order: video.order,
              aiPrompt: video.aiPrompt,
              courseId: newCourse.id,
              sectionId: newSection.id,
            },
          });

          // Create tests for this video
          for (const test of video.tests) {
            await tx.test.create({
              data: {
                question: test.question,
                options: test.options as Prisma.InputJsonValue,
                correct: test.correct,
                explanation: test.explanation,
                difficulty: test.difficulty,
                videoId: newVideo.id,
              },
            });
          }
        }
      }

      // Create standalone videos (not in sections)
      for (const video of originalCourse.videos) {
        const newVideo = await tx.video.create({
          data: {
            title: video.title,
            description: video.description,
            videoUrl: video.videoUrl,
            duration: video.duration,
            order: video.order,
            aiPrompt: video.aiPrompt,
            courseId: newCourse.id,
            sectionId: null,
          },
        });

        // Create tests for this video
        for (const test of video.tests) {
          await tx.test.create({
            data: {
              question: test.question,
              options: test.options as Prisma.InputJsonValue,
              correct: test.correct,
              explanation: test.explanation,
              difficulty: test.difficulty,
              videoId: newVideo.id,
            },
          });
        }
      }

      // Return the complete course with all related data
      return await tx.course.findUnique({
        where: { id: newCourse.id },
        include: {
          videos: {
            select: { id: true },
          },
          sections: {
            include: {
              videos: {
                select: { id: true },
              },
            },
          },
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
      });
    });

    return NextResponse.json(duplicatedCourse);
  } catch (error) {
    console.error("Error duplicating course:", error);
    return NextResponse.json(
      {
        error: "Failed to duplicate course",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
