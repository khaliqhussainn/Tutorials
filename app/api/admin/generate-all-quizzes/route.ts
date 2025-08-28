// app/api/admin/generate-all-quizzes/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { TranscriptQuizGenerator } from "@/lib/quiz-generator"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const generator = new TranscriptQuizGenerator()
    await generator.generateQuizForAllVideos()
    
    return NextResponse.json({ 
      success: true,
      message: 'Quiz generation started for all videos without quizzes'
    })

  } catch (error) {
    console.error("Error generating quizzes:", error)
    return NextResponse.json({ 
      error: "Failed to start quiz generation" 
    }, { status: 500 })
  }
}