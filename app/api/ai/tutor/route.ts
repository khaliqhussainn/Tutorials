// app/api/ai/tutor/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const requestBody = await request.json()
    const { 
      query,
      videoId,
      videoTitle,
      transcript,
      courseTitle,
      courseCategory,
      context = []
    } = requestBody

    // Check if OpenAI API key exists
    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ OpenAI API key not found')
      return NextResponse.json({ 
        error: "OpenAI API key not configured",
        content: "I'm sorry, but the AI features are not currently configured. Please check your OpenAI API key settings."
      })
    }

    console.log(`🤖 AI Tutor question: "${query}" for video: "${videoTitle}"`)

    // Build context from video and previous messages
    const contextMessages = context.slice(-3).map((msg: any) => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))

    const systemPrompt = buildTutorSystemPrompt(videoTitle, transcript, courseTitle, courseCategory)
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...contextMessages,
          { role: "user", content: query }
        ],
        temperature: 0.7,
        max_tokens: 800,
      })

      const content = completion.choices[0]?.message?.content || ""
      
      console.log(`✅ AI Tutor responded to: "${query.substring(0, 50)}..."`)
      
      return NextResponse.json({ 
        content: content.trim(),
        source: 'openai'
      })

    } catch (openaiError) {
      console.error('❌ OpenAI API Error:', openaiError)
      return NextResponse.json({ 
        error: "Failed to get AI response",
        content: generateFallbackResponse(query, videoTitle, courseCategory)
      })
    }

  } catch (error) {
    console.error('❌ AI Tutor error:', error)
    return NextResponse.json({ 
      content: "I'm sorry, but I encountered an error processing your question. Please try again.",
      source: 'fallback'
    })
  }
}

function buildTutorSystemPrompt(
  videoTitle: string,
  transcript: string,
  courseTitle: string,
  courseCategory: string
): string {
  return `You are an expert AI tutor and teaching assistant. You help students understand educational content and answer their questions clearly and helpfully.

CURRENT LESSON CONTEXT:
- Video Title: "${videoTitle}"
- Course: "${courseTitle || 'N/A'}"
- Category: "${courseCategory || 'General'}"
- Transcript Available: ${transcript ? 'Yes' : 'No'}
${transcript ? `- Video Content Summary: ${transcript.substring(0, 500)}...` : ''}

YOUR ROLE:
- Answer questions about the current lesson and general topics
- Provide clear, educational explanations suitable for students
- Give practical examples when helpful
- Connect concepts to broader learning goals
- Be encouraging and supportive
- If asked about content not in the video, provide general educational help

RESPONSE STYLE:
- Be conversational but informative
- Use bullet points or numbered lists when helpful
- Provide examples and analogies when explaining complex concepts
- Keep responses focused and concise (under 300 words typically)
- Always aim to help the student learn and understand

You can answer questions about:
1. The specific video content
2. Related concepts and topics
3. General educational questions
4. Study tips and learning strategies
5. How concepts connect to broader subjects
6. Practical applications of the material`
}

function generateFallbackResponse(query: string, videoTitle: string, courseCategory: string): string {
  const lowerQuery = query.toLowerCase()
  
  if (lowerQuery.includes('summary') || lowerQuery.includes('summarize')) {
    return `Based on the video "${videoTitle}", here are the key points you should focus on:

• Understanding the main concepts presented
• Identifying practical applications
• Connecting this lesson to broader ${courseCategory} topics
• Practicing the techniques or methods shown

For a more detailed summary, I'd recommend reviewing the video content and taking notes on the specific techniques and concepts covered.`
  }
  
  if (lowerQuery.includes('explain') || lowerQuery.includes('what is')) {
    return `I'd be happy to explain concepts from "${videoTitle}". While I don't have the specific video details right now, I can help you understand:

• Core concepts in ${courseCategory}
• How different techniques and methods work
• Best practices and common approaches
• Real-world applications of the material

Could you be more specific about which concept you'd like me to explain?`
  }
  
  if (lowerQuery.includes('practice') || lowerQuery.includes('exercise')) {
    return `Great question about practicing the material from "${videoTitle}"! Here are some effective ways to reinforce your learning:

• Try implementing the concepts shown in the video
• Create small projects using the techniques covered
• Explain the concepts to someone else (or write them down)
• Look for similar examples online to practice with
• Apply the methods to solve different problems

Practice is key to mastering any skill in ${courseCategory}!`
  }
  
  if (lowerQuery.includes('tips') || lowerQuery.includes('advice')) {
    return `Here are some study tips for mastering the content from "${videoTitle}":

• Take active notes while watching
• Pause the video to practice concepts immediately
• Review the material within 24 hours
• Connect new concepts to what you already know
• Teach the concepts to someone else
• Look for additional resources on the same topic

The key is active engagement rather than passive consumption!`
  }
  
  return `I'd love to help you with your question about "${videoTitle}". While I'm having trouble accessing the specific video content right now, I can still assist with:

• General concepts in ${courseCategory}
• Study strategies and learning tips
• Explanations of common techniques and methods
• How topics connect to broader learning goals

Could you rephrase your question or be more specific about what you'd like to learn?`
}