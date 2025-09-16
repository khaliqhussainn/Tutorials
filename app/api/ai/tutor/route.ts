// app/api/ai/tutor/route.ts
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

    const { query, videoId, videoTitle, transcript, type, context } = await request.json()

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        type,
        content: "AI features are currently unavailable. Please contact support.",
        confidence: 0
      })
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      }
    })

    let prompt = buildTutorPrompt(query, videoTitle, transcript, type, context)
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const content = response.text()

    return NextResponse.json({
      type,
      content,
      confidence: 0.9,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI Tutor error:', error)
    return NextResponse.json({ 
      error: "Failed to generate AI response" 
    }, { status: 500 })
  }
}

function buildTutorPrompt(query: string, videoTitle: string, transcript: string, type: string, context: any[]) {
  const contextStr = context?.length > 0 
    ? `Previous conversation:\n${context.map(c => `${c.type}: ${c.content}`).join('\n')}\n\n`
    : ''

  const baseContext = `You are an AI learning tutor helping students understand educational content.
Video: "${videoTitle}"
${transcript ? `Transcript: ${transcript.substring(0, 2000)}...` : 'No transcript available.'}

${contextStr}Student Question: ${query}

Provide a helpful, educational response that:`

  switch (type) {
    case 'summary':
      return `${baseContext}
- Summarizes the key points from the video
- Uses clear, concise language
- Highlights the most important concepts
- Organizes information logically`

    case 'explanation':
      return `${baseContext}
- Explains concepts in simple terms
- Uses examples and analogies when helpful
- Breaks down complex ideas into smaller parts
- Encourages understanding rather than memorization`

    case 'quiz':
      return `${baseContext}
- Creates relevant practice questions
- Includes a mix of difficulty levels
- Focuses on understanding key concepts
- Provides explanations for answers`

    case 'notes':
      return `${baseContext}
- Helps organize key information
- Suggests effective note-taking strategies
- Highlights important concepts to remember
- Creates structured, scannable content`

    default:
      return `${baseContext}
- Directly answers the student's question
- Is educational and encouraging
- Provides practical learning advice
- Relates to the video content when possible`
  }
}
