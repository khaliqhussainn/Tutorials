// app/api/admin/debug/quiz-status/[videoId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
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

    // Fetch video with transcript and tests
    const video = await prisma.video.findUnique({
      where: { id: params.videoId },
      include: {
        transcript: true,
        tests: true,
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Safely build debug info
    const debugInfo = {
      video: {
        id: video.id,
        title: video.title,
        hasAiPrompt: !!video.aiPrompt,
      },
      transcript: video.transcript
        ? {
            id: video.transcript.id,
            length: video.transcript.content?.length || 0,
            confidence: video.transcript.confidence || 0,
            status: video.transcript.status || "NOT_FOUND",
          }
        : null,
      quiz: {
        count: video.tests.length,
        hasExplanations: video.tests.filter((test) => test.explanation).length,
      },
      recommendations: {
        canGenerateFromTranscript:
          !!video.transcript?.content && video.transcript.content.length > 100,
        shouldRegenerateFromTranscript:
          !!video.transcript?.content &&
          video.transcript.content.length > 100 &&
          video.tests.length === 0,
        needsQuizGeneration: video.tests.length === 0,
      },
    };

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error("Error in debug/quiz-status:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch debug info",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
