// app/api/ai/learning-profile/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user learning data
    const learningData = await prisma.user.findUnique({
      where: { id: params.userId },
      include: {
        enrollments: {
          include: {
            course: { select: { category: true, level: true, title: true } }
          }
        },
        videoProgress: {
          where: { completed: true },
          include: {
            video: {
              select: { 
                duration: true,
                course: { select: { category: true } }
              }
            }
          }
        }
      }
    })

    if (!learningData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calculate learning profile
    const categories = learningData.enrollments.map(e => e.course.category)
    const uniqueCategories = Array.from(new Set(categories)) // ✅ FIX: Use Array.from instead of spread
    const totalWatchTime = learningData.videoProgress.reduce(
      (sum, p) => sum + (p.video.duration || 0), 0
    )

    const profile = {
      preferredCategories: uniqueCategories,
      totalWatchTime,
      completedVideos: learningData.videoProgress.length,
      averageSessionLength: totalWatchTime / Math.max(learningData.videoProgress.length, 1),
      learningStreak: 0, // Calculate based on recent activity
      strongSubjects: uniqueCategories.slice(0, 3),
      learningStyle: 'visual', // Default, can be determined from interactions
    }

    // Generate suggestions
    const suggestions = [
      "Continue your current course to maintain momentum",
      "Take breaks between study sessions for better retention",
      "Review AI-generated notes before starting new topics"
    ]

    return NextResponse.json({
      profile,
      suggestions,
      comprehensionScore: 85 // Can be calculated from AI interactions
    })

  } catch (error) {
    console.error('Learning profile error:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}