// app/api/admin/videos/[videoId]/generate-quiz/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TranscriptQuizGenerator } from "@/lib/quiz-generator";

export async function POST(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { regenerate = false, source = "manual" } = await request.json();

    // Get video with transcript and current tests
    const video = await prisma.video.findUnique({
      where: { id: params.videoId },
      include: {
        transcript: {
          select: {
            status: true,
            content: true,
            confidence: true,
            provider: true,
          },
        },
        tests: {
          select: { id: true, question: true },
        },
        course: {
          select: { title: true, category: true, level: true },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // If quiz already exists and regenerate is false, return existing quiz info
    if (video.tests.length > 0 && !regenerate) {
      return NextResponse.json({
        message: "Quiz already exists. Use regenerate=true to replace it.",
        hasQuiz: true,
        questionCount: video.tests.length,
        transcriptStatus: video.transcript?.status || "NOT_FOUND",
      });
    }

    console.log(`Generating quiz for video: ${video.id}`);
    console.log(`Transcript status: ${video.transcript?.status || "NOT_FOUND"}`);
    console.log(`Regenerate flag: ${regenerate}`);

    // Initialize quiz generator
    const generator = new TranscriptQuizGenerator();

    // Generate quiz (will prioritize transcript if available)
    const questions = await generator.generateQuizFromVideo(params.videoId);

    // Save questions to the database
    await prisma.$transaction(async (tx) => {
      // Delete existing questions if regenerating
      if (regenerate) {
        await tx.test.deleteMany({
          where: { videoId: params.videoId },
        });
      }

      // Create new questions
      await tx.test.createMany({
        data: questions.map((q, index) => ({
          videoId: params.videoId,
          question: q.question,
          options: q.options,
          correct: q.correct,
          explanation: q.explanation,
          difficulty: q.difficulty,
          points: q.points,
          order: index,
        })),
      });
    });

    const generationSource =
      video.transcript?.status === "COMPLETED" &&
      video.transcript.content &&
      video.transcript.content.length > 100
        ? "transcript"
        : "topic";

    console.log(
      `Generated ${questions.length} questions from ${generationSource}`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${questions.length} quiz questions`,
      count: questions.length,
      source: generationSource,
      transcriptAvailable: video.transcript?.status === "COMPLETED",
      transcriptLength: video.transcript?.content?.length || 0,
      questions: questions.map((q) => ({
        question: q.question.substring(0, 80) + "...",
        difficulty: q.difficulty,
        points: q.points,
      })),
    });
  } catch (error) {
    console.error("Error generating quiz:", error);
    return NextResponse.json(
      {
        error: "Failed to generate quiz",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
