
// app/api/admin/videos/[videoId]/generate-quiz/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { TranscriptQuizGenerator } from "@/lib/quiz-generator"

export async function POST(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { regenerate = false } = await request.json()
    const generator = new TranscriptQuizGenerator()
    
    const questions = await generator.generateQuizFromVideo(params.videoId)
    
    return NextResponse.json({ 
      success: true,
      questions,
      message: regenerate ? 'Quiz regenerated successfully' : 'Quiz generated successfully',
      count: questions.length
    })

  } catch (error) {
    console.error("Error generating quiz:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to generate quiz" 
    }, { status: 500 })
  }
}
