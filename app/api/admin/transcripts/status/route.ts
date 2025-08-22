// app/api/admin/transcripts/status/route.ts

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get transcript statistics
    const stats = await prisma.transcript.groupBy({
      by: ['status'],
      _count: { status: true }
    })

    const statusCounts = stats.reduce((acc, item) => {
      acc[item.status.toLowerCase()] = item._count.status
      return acc
    }, {} as Record<string, number>)

    // Get total videos without transcripts
    const videosWithoutTranscripts = await prisma.video.count({
      where: {
        transcript: null
      }
    })

    // Get recent transcript activity
    const recentTranscripts = await prisma.transcript.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        video: {
          select: { id: true, title: true }
        }
      }
    })

    return NextResponse.json({
      statistics: {
        pending: statusCounts.pending || 0,
        processing: statusCounts.processing || 0,
        completed: statusCounts.completed || 0,
        failed: statusCounts.failed || 0,
        withoutTranscript: videosWithoutTranscripts
      },
      recentActivity: recentTranscripts.map(t => ({
        videoId: t.videoId,
        videoTitle: t.video.title,
        status: t.status,
        confidence: t.confidence,
        provider: t.provider,
        error: t.error,
        updatedAt: t.updatedAt
      })),
      config: {
        openaiConfigured: !!process.env.OPENAI_API_KEY,
        defaultProvider: 'openai'
      }
    })

  } catch (error) {
    console.error("Error fetching transcript status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}