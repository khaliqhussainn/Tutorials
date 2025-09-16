// app/api/ai/learning-path/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { videoId, userProgress, hasQuiz } = await request.json()

    // Generate learning path based on progress
    const path = []

    if (userProgress < 100) {
      path.push({
        id: 1,
        title: "Complete the video lesson",
        description: "Watch the full video to understand all concepts",
        status: "current",
        estimatedTime: "10-15 min"
      })
    }

    if (hasQuiz && userProgress >= 100) {
      path.push({
        id: 2,
        title: "Take the knowledge quiz",
        description: "Test your understanding with practice questions",
        status: "available",
        estimatedTime: "5-10 min"
      })
    }

    path.push({
      id: 3,
      title: "Review AI-generated notes",
      description: "Go through key points and concepts",
      status: userProgress >= 100 ? "available" : "locked",
      estimatedTime: "5 min"
    })

    path.push({
      id: 4,
      title: "Explore related topics",
      description: "Discover connected learning materials",
      status: userProgress >= 100 ? "available" : "locked",
      estimatedTime: "15-20 min"
    })

    return NextResponse.json({ path })

  } catch (error) {
    console.error('Learning path error:', error)
    return NextResponse.json({ path: [] })
  }
}
