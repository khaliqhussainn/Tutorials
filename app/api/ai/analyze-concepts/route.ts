
// app/api/ai/analyze-concepts/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { videoId, transcript, title } = await request.json()

    if (!process.env.GEMINI_API_KEY || !transcript) {
      return NextResponse.json({ concepts: [] })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const prompt = `Analyze this educational video transcript and extract key concepts:

Title: "${title}"
Transcript: ${transcript.substring(0, 3000)}

Extract 5-8 key concepts and return as JSON:
{
  "concepts": [
    {
      "concept": "Main concept name",
      "description": "Brief explanation",
      "difficulty": "easy|medium|hard",
      "connections": ["related concept names"]
    }
  ]
}

Focus on the most important learning objectives and fundamental ideas.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return NextResponse.json(parsed)
      }
    } catch (e) {
      console.error('Failed to parse concepts JSON:', e)
    }

    return NextResponse.json({ concepts: [] })

  } catch (error) {
    console.error('Concept analysis error:', error)
    return NextResponse.json({ concepts: [] })
  }
}
