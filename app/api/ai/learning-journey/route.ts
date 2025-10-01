// app/api/ai/learning-journey/route.ts - Simplified & Course-Specific
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

interface LearningPathStep {
  id: number
  title: string
  description: string
  category: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  status: 'completed' | 'current' | 'upcoming'
  skills: string[]
}

interface LearningJourney {
  title: string
  description: string
  steps: LearningPathStep[]
  source?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const requestBody = await request.json()
    const { 
      videoTitle,
      courseTitle,
      courseCategory,
      description
    } = requestBody

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        error: "OpenAI API key not configured"
      }, { status: 500 })
    }

    console.log(`🗺️ Generating career journey for: "${videoTitle}" in ${courseCategory}`)

    const prompt = `Create a focused career learning roadmap for someone studying "${courseTitle || videoTitle}" in the ${courseCategory} field.

Generate 6-8 progressive learning phases that build from fundamentals to advanced expertise specifically in ${courseCategory}.

IMPORTANT: Make this roadmap SPECIFIC to ${courseCategory}. Include technologies, tools, frameworks, and concepts that are actually used in ${courseCategory}.

Return ONLY valid JSON in this exact format:
{
  "title": "Specific career path title for ${courseCategory}",
  "description": "Brief description of this ${courseCategory} learning journey",
  "steps": [
    {
      "title": "Phase name",
      "description": "What you'll learn in this phase",
      "category": "${courseCategory}",
      "difficulty": "Beginner",
      "skills": ["specific skill 1", "specific skill 2", "specific skill 3"]
    }
  ]
}

Make it practical and industry-relevant for ${courseCategory}. Include 6-8 steps total.`

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "You are a career advisor who creates concise, industry-specific learning roadmaps. Return only valid JSON with no markdown formatting." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      })

      const content = completion.choices[0]?.message?.content?.trim() || ""
      
      // Clean and parse the response
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleanContent)
      
      // Format the response with proper structure
      return NextResponse.json({
        title: parsed.title || `${courseCategory} Learning Path`,
        description: parsed.description || `Master ${courseCategory} from fundamentals to advanced`,
        steps: Array.isArray(parsed.steps) ? parsed.steps.map((step: any, index: number) => ({
          id: index + 1,
          title: step.title || `Phase ${index + 1}`,
          description: step.description || '',
          category: step.category || courseCategory,
          difficulty: ['Beginner', 'Intermediate', 'Advanced'].includes(step.difficulty) 
            ? step.difficulty 
            : (index < 2 ? 'Beginner' : index < 5 ? 'Intermediate' : 'Advanced'),
          status: index === 0 ? 'current' : 'upcoming',
          skills: Array.isArray(step.skills) ? step.skills.slice(0, 6) : []
        })) : [],
        source: 'openai'
      })
      
    } catch (openaiError) {
      console.error('OpenAI API Error:', openaiError)
      return NextResponse.json({
        error: "Failed to generate learning path"
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Learning journey generation error:', error)
    return NextResponse.json({
      error: "Server error"
    }, { status: 500 })
  }
}