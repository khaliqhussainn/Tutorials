// app/api/ai/tutor/route.ts - Enhanced for Q&A functionality
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

    const { 
      query, 
      videoId, 
      videoTitle, 
      transcript, 
      courseTitle,
      courseCategory,
      type, 
      context 
    } = await request.json()

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        type,
        content: "AI features are currently unavailable. Please contact support for assistance.",
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

    let prompt = buildEnhancedTutorPrompt(
      query, 
      videoTitle, 
      transcript, 
      courseTitle,
      courseCategory,
      type, 
      context
    )
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const content = response.text()

    // Track interaction (fire and forget)
    trackInteraction(session.user.email, videoId, query, content, type).catch(console.error)

    return NextResponse.json({
      type,
      content,
      confidence: 0.9,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI Tutor error:', error)
    
    // Provide helpful fallback responses based on query type
    const fallbackContent = generateFallbackResponse(request.body?.query, request.body?.type)
    
    return NextResponse.json({ 
      type: request.body?.type || 'general',
      content: fallbackContent,
      confidence: 0.3,
      timestamp: new Date().toISOString()
    })
  }
}

function buildEnhancedTutorPrompt(
  query: string, 
  videoTitle: string, 
  transcript: string, 
  courseTitle: string,
  courseCategory: string,
  type: string, 
  context: any[]
): string {
  const contextStr = context?.length > 0 
    ? `Previous conversation:\n${context.map(c => `${c.type}: ${c.content}`).join('\n')}\n\n`
    : ''

  const baseContext = `You are an expert AI learning tutor helping students understand educational content. You are knowledgeable, encouraging, and provide clear explanations.

Learning Context:
- Video: "${videoTitle}"
- Course: "${courseTitle || 'Not specified'}"
- Category: "${courseCategory || 'General'}"
- Transcript: ${transcript ? transcript.substring(0, 2500) + '...' : 'No transcript available.'}

${contextStr}Student Question: ${query}

Important Guidelines:
- Be encouraging and supportive
- Provide clear, step-by-step explanations
- Use examples when helpful
- Relate answers to the video content when possible
- Ask follow-up questions to encourage deeper learning
- Keep responses focused and practical
- Adapt your language to the subject matter (technical for coding, accessible for general topics)`

  switch (type) {
    case 'question':
    case 'chat':
    case 'general':
      return `${baseContext}

Provide a helpful, educational response that:
- Directly answers the student's question
- Explains concepts clearly and simply
- Connects to the video content when relevant
- Encourages further exploration
- Is supportive and motivating

If the question is about:
- ${courseCategory} concepts: Provide technical accuracy with clear examples
- Study strategies: Give practical, actionable advice
- Career guidance: Offer realistic, encouraging guidance
- Clarification: Break down complex topics into simpler parts

Keep your response conversational but informative.`

    case 'summary':
      return `${baseContext}

Create a comprehensive summary that:
- Highlights the key points from the video
- Organizes information logically with clear sections
- Uses bullet points for easy scanning
- Includes practical takeaways
- Emphasizes the most important concepts for ${courseCategory}

Format as a structured summary with headers and bullet points.`

    case 'explanation':
      return `${baseContext}

Provide a detailed explanation that:
- Breaks down complex concepts into understandable parts
- Uses analogies and examples appropriate for ${courseCategory}
- Explains the "why" behind concepts, not just the "what"
- Connects to real-world applications
- Builds understanding progressively

Make it educational and engaging.`

    case 'quiz':
    case 'practice':
      return `${baseContext}

Create practice questions that:
- Test understanding of key concepts from the video
- Include a mix of difficulty levels
- Focus on practical application in ${courseCategory}
- Provide brief explanations for correct answers
- Encourage critical thinking

Generate 3-5 questions with multiple choice or short answer format.`

    case 'notes':
      return `${baseContext}

Help create effective study notes by:
- Organizing key information from the video
- Suggesting note-taking strategies for ${courseCategory}
- Highlighting important concepts to remember
- Creating structured, scannable content
- Including practical examples and applications

Provide note-taking guidance and key points to include.`

    default:
      return `${baseContext}

Provide a helpful response that:
- Addresses the student's question directly
- Is educational and encouraging
- Relates to the video content
- Provides practical value for learning ${courseCategory}

Keep it supportive and informative.`
  }
}

async function trackInteraction(
  userEmail: string, 
  videoId: string, 
  query: string, 
  response: string, 
  type: string
): Promise<void> {
  try {
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/track-interaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId,
        interaction: { type, query, response }
      })
    })
  } catch (error) {
    console.error('Failed to track interaction:', error)
  }
}

function generateFallbackResponse(query: string, type: string): string {
  if (!query) {
    return "I'm here to help you learn! Please ask me a specific question about the lesson content."
  }

  const queryLower = query.toLowerCase()

  // Common question patterns
  if (queryLower.includes('explain') || queryLower.includes('what is') || queryLower.includes('how does')) {
    return `I'd be happy to explain that concept! While I can't access the full lesson content right now, I can tell you that understanding this topic is important for building a strong foundation. 

Here are some general approaches to learning new concepts:
1. Break complex ideas into smaller, manageable parts
2. Look for real-world examples and applications
3. Practice applying the concept in different scenarios
4. Connect new information to what you already know

Try rewatching the relevant section of the video and taking notes on the key points.`
  }

  if (queryLower.includes('practice') || queryLower.includes('quiz') || queryLower.includes('test')) {
    return `Practice is essential for mastering new concepts! Here are some effective ways to practice what you've learned:

1. **Self-Testing**: Quiz yourself on key concepts from the lesson
2. **Application**: Try to apply the concepts to real scenarios
3. **Teaching Others**: Explain the concepts to someone else
4. **Hands-on Practice**: If it's a technical subject, practice the skills demonstrated

For specific practice questions related to this lesson, I recommend:
- Reviewing the main points covered in the video
- Creating your own questions based on the content
- Looking for practical exercises in your course materials`
  }

  if (queryLower.includes('summary') || queryLower.includes('main points') || queryLower.includes('key concepts')) {
    return `To create an effective summary of any lesson, focus on these elements:

**Key Components of Good Study Notes:**
- Main topic and learning objectives
- Core concepts and definitions
- Important examples or demonstrations
- Practical applications
- Key takeaways and action items

**Study Tips:**
- Write summaries in your own words
- Use bullet points for easy review
- Include specific examples from the lesson
- Connect new concepts to previous knowledge
- Review and revise your notes regularly`
  }

  if (queryLower.includes('help') || queryLower.includes('stuck') || queryLower.includes('confused')) {
    return `It's completely normal to feel confused when learning new concepts! Here are some strategies that can help:

**When You're Stuck:**
1. **Break it Down**: Identify the specific part that's confusing
2. **Rewatch**: Go back to that section of the video
3. **Take Notes**: Write down what you understand and what's unclear
4. **Look for Patterns**: See how this connects to other concepts
5. **Practice**: Apply the concept in a simple example

**Remember:**
- Learning takes time and repetition
- Confusion often means you're stretching your understanding
- Each time you review, you'll understand more
- Don't hesitate to ask specific questions about what's unclear`
  }

  // Type-specific fallbacks
  switch (type) {
    case 'summary':
      return `I'd love to help create a summary! While I can't access the full lesson content right now, here's how to create an effective summary:

1. **Introduction**: What is the main topic?
2. **Key Points**: What are the 3-5 most important concepts?
3. **Examples**: What practical examples were given?
4. **Applications**: How can you use this knowledge?
5. **Next Steps**: What should you learn next?

Try creating your own summary using these sections, and feel free to ask specific questions about any part of the lesson.`

    case 'explanation':
      return `I'm here to help explain concepts! To give you the best explanation, it would be helpful to know:

- Which specific concept from the lesson you'd like explained
- What part is confusing or unclear
- Whether you're looking for a simple overview or detailed explanation

In the meantime, here are some general learning strategies:
- Start with the big picture, then dive into details
- Look for cause-and-effect relationships
- Think about how this applies to real situations
- Connect new ideas to things you already understand`

    case 'quiz':
      return `Great idea to test your knowledge! Here are some general question types to help you study:

**Understanding Questions:**
- What is the main purpose of [concept]?
- How does [process] work?
- Why is [principle] important?

**Application Questions:**
- When would you use [technique]?
- What would happen if [scenario]?
- How would you solve [problem]?

**Analysis Questions:**
- What are the advantages/disadvantages?
- How does this compare to [alternative]?
- What are the key factors to consider?

Try creating questions like these based on your lesson content!`

    default:
      return `I'm here to help you learn and understand the lesson content better! While I can't access all the details right now, I can still assist you with:

- Explaining general concepts and principles
- Providing study strategies and tips
- Helping you think through problems
- Suggesting ways to practice and reinforce learning

Please feel free to ask specific questions about the lesson content, and I'll do my best to help guide your learning process.`
  }
}