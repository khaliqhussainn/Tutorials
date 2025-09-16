// app/api/ai/generate-notes/route.ts
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
      return NextResponse.json({ 
        notes: "AI note generation is currently unavailable.",
        tags: []
      })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const prompt = `Create comprehensive study notes from this educational video:

Title: "${title}"
Transcript: ${transcript.substring(0, 4000)}

Generate well-structured notes that include:
1. Key concepts and definitions
2. Important points and takeaways  
3. Examples and applications
4. Summary of main ideas

Format as clear, scannable text with bullet points and sections.
Also suggest 3-5 relevant tags for categorization.

Return as JSON:
{
  "notes": "Formatted study notes content",
  "tags": ["tag1", "tag2", "tag3"]
}`

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
      console.error('Failed to parse notes JSON:', e)
    }

    // Fallback if JSON parsing fails
    return NextResponse.json({
      notes: text.replace(/```json|```/g, '').trim(),
      tags: ["study-notes", "ai-generated"]
    })

  } catch (error) {
    console.error('Note generation error:', error)
    return NextResponse.json({ 
      notes: "Failed to generate notes. Please try again.",
      tags: []
    })
  }
}