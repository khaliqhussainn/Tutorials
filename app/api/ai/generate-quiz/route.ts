// app/api/ai/generate-quiz/route.ts - Fixed TypeScript errors
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correct: number
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
}

// Store generation counts in memory (in production, use database)
const quizGenerationCount = new Map<string, number>()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const requestBody = await request.json()
    const { 
      videoId, 
      videoTitle, 
      transcript, 
      courseTitle, 
      courseCategory,
      difficulty = 'mixed',
      questionCount = 5,
      regenerateAttempt = 0
    } = requestBody

    // Check regeneration limit
    const countKey = `${session.user.id}-${videoId}`
    const currentCount = quizGenerationCount.get(countKey) || 0
    
    if (currentCount >= 2) {
      return NextResponse.json({ 
        error: "Quiz generation limit reached",
        message: "You can only regenerate quizzes 2 times per video to ensure quality learning.",
        questions: [],
        generationCount: currentCount,
        remainingGenerations: 0
      }, { status: 429 })
    }

    if (!process.env.OPENAI_API_KEY) {
      const fallbackQuestions = generateAdvancedFallbackQuiz(videoTitle, courseCategory, questionCount, videoId, currentCount)
      return NextResponse.json({ 
        questions: fallbackQuestions,
        source: 'fallback',
        generationCount: currentCount,
        remainingGenerations: Math.max(0, 2 - currentCount)
      })
    }

    const prompt = buildAdvancedQuizPrompt(
      videoTitle, 
      transcript, 
      courseTitle, 
      courseCategory,
      difficulty,
      questionCount,
      videoId,
      currentCount
    )

    console.log(`🎯 Generating advanced quiz #${currentCount + 1} for: "${videoTitle}"`)

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "You are an expert educational assessment creator specializing in deep, thought-provoking questions that test real understanding, application, and critical thinking skills." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.8 + (currentCount * 0.1),
        max_tokens: 2000,
      })

      const content = completion.choices[0]?.message?.content?.trim() || ""

      try {
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
        const parsed = JSON.parse(cleanContent)
        
        const questions = (Array.isArray(parsed) ? parsed : parsed.questions || []).map((q: any, index: number) => ({
          id: `${videoId}_q${index + 1}_${Date.now()}_gen${currentCount}`,
          question: q.question || `Question ${index + 1}`,
          options: Array.isArray(q.options) ? q.options : [],
          correct: typeof q.correct === 'number' ? q.correct : 0,
          explanation: q.explanation || 'Explanation not provided',
          difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
          points: q.points || (q.difficulty === 'hard' ? 15 : q.difficulty === 'easy' ? 5 : 10)
        })).filter((q: QuizQuestion) => q.options.length >= 4)
        
        // Increment generation count
        quizGenerationCount.set(countKey, currentCount + 1)
        
        return NextResponse.json({ 
          questions: questions.slice(0, questionCount),
          source: 'openai',
          generationCount: currentCount + 1,
          remainingGenerations: Math.max(0, 2 - (currentCount + 1))
        })

      } catch (parseError) {
        console.error('JSON parsing failed:', parseError)
        const fallbackQuestions = generateAdvancedFallbackQuiz(videoTitle, courseCategory, questionCount, videoId, currentCount)
        return NextResponse.json({ 
          questions: fallbackQuestions,
          source: 'fallback',
          generationCount: currentCount,
          remainingGenerations: Math.max(0, 2 - currentCount)
        })
      }

    } catch (openaiError) {
      console.error('OpenAI API Error:', openaiError)
      const fallbackQuestions = generateAdvancedFallbackQuiz(videoTitle, courseCategory, questionCount, videoId, currentCount)
      return NextResponse.json({ 
        questions: fallbackQuestions,
        source: 'fallback',
        generationCount: currentCount,
        remainingGenerations: Math.max(0, 2 - currentCount)
      })
    }

  } catch (error) {
    console.error('Quiz generation error:', error)
    const fallbackQuestions = generateAdvancedFallbackQuiz('Video Content', 'General', 5, 'fallback', 0)
    return NextResponse.json({ 
      questions: fallbackQuestions,
      source: 'fallback',
      generationCount: 0,
      remainingGenerations: 2
    })
  }
}

function buildAdvancedQuizPrompt(
  videoTitle: string,
  transcript: string,
  courseTitle: string,
  courseCategory: string,
  difficulty: string,
  questionCount: number,
  videoId: string,
  attemptNumber: number
): string {
  const attemptContext = attemptNumber === 0 ? 
    "This is the first quiz generation - focus on core understanding." :
    attemptNumber === 1 ?
    "This is the second generation - create different, more challenging questions that test deeper understanding and application." :
    "This is the final generation - create the most advanced questions focusing on synthesis, evaluation, and real-world application."

  return `Create ${questionCount} high-quality, thought-provoking quiz questions for "${videoTitle}".

${attemptContext}

VIDEO CONTEXT:
Title: ${videoTitle}
Course: ${courseTitle || 'N/A'}
Category: ${courseCategory || 'General'}
Transcript: ${transcript ? transcript.substring(0, 1500) + '...' : 'Generate based on title and course context'}

QUESTION QUALITY REQUIREMENTS:
1. AVOID basic recall questions like "What is X?" or "Which of the following..."
2. CREATE questions that test:
   - Deep understanding and conceptual connections
   - Practical application and problem-solving
   - Critical thinking and analysis
   - Real-world scenarios and use cases
   - Common misconceptions and edge cases

3. DIFFICULTY DISTRIBUTION: ${difficulty === 'mixed' ? '2 easy, 2 medium, 1 hard' : `All ${difficulty}`}

4. QUESTION TYPES TO INCLUDE:
   - Scenario-based: "Given situation X, what would be the best approach and why?"
   - Problem-solving: "If you encountered [specific problem], how would you solve it using concepts from this lesson?"
   - Comparative: "When would you use approach A vs approach B in real practice?"
   - Synthesis: "How do the concepts in this lesson connect to [related topic]?"
   - Application: "In a professional setting, how would you apply this knowledge?"

5. MAKE DISTRACTORS (wrong answers) plausible but clearly incorrect to experts
6. ENSURE each question is unique and tests different aspects
7. AVOID overlapping or repetitive content

EXAMPLE QUESTION PATTERNS:
- "A developer is building [specific scenario]. What's the most effective approach and why?"
- "When implementing [concept from video], what's the most critical consideration for [real context]?"
- "Which approach would be most suitable for [specific use case] and what are the trade-offs?"

RESPONSE FORMAT (JSON only):
[
  {
    "question": "Detailed scenario-based question that tests real understanding",
    "options": [
      "Comprehensive correct answer with specific reasoning",
      "Plausible but incorrect option with common misconception",
      "Another realistic but wrong approach",
      "Third believable but incorrect solution"
    ],
    "correct": 0,
    "explanation": "Detailed explanation of why this is correct, what makes other options wrong, and how this applies in practice",
    "difficulty": "medium",
    "points": 10
  }
]

Generate exactly ${questionCount} unique, high-quality questions. Return only valid JSON.`
}

function generateAdvancedFallbackQuiz(
  videoTitle: string, 
  courseCategory: string, 
  questionCount: number,
  videoId: string,
  attemptNumber: number
): QuizQuestion[] {
  const category = courseCategory || 'General'
  const questions: QuizQuestion[] = []
  
  // Advanced React questions
  if (videoTitle.toLowerCase().includes('react')) {
    questions.push(
      {
        id: `${videoId}_adv_react_1_${attemptNumber}`,
        question: `You're building a React application where a component needs to fetch user data on mount and update it when the user ID changes. The data should be cached to avoid unnecessary API calls. What's the most effective approach?`,
        options: [
          "Use useEffect with dependency array and implement custom caching logic with useRef",
          "Use useState and fetch data in the component constructor",
          "Use multiple useEffect hooks without dependency arrays for different scenarios",
          "Fetch data directly in the render method with conditional statements"
        ],
        correct: 0,
        explanation: "useEffect with dependencies ensures the effect runs when user ID changes, while custom caching with useRef prevents unnecessary API calls and maintains performance.",
        difficulty: 'medium',
        points: 12
      },
      {
        id: `${videoId}_adv_react_2_${attemptNumber}`,
        question: `In a React application with deeply nested components, several child components need access to user authentication state. Performance is critical. What's the best state management approach?`,
        options: [
          "Implement React Context with useMemo optimization to prevent unnecessary re-renders",
          "Pass props down through all intermediate components (prop drilling)",
          "Use multiple useState hooks in each component that needs the data",
          "Store authentication state in localStorage and access it directly in each component"
        ],
        correct: 0,
        explanation: "React Context with useMemo prevents prop drilling while optimizing performance by memoizing the context value to avoid unnecessary re-renders of consuming components.",
        difficulty: 'hard',
        points: 15
      }
    )
  }
  
  // Advanced JavaScript questions
  else if (videoTitle.toLowerCase().includes('javascript')) {
    questions.push(
      {
        id: `${videoId}_adv_js_1_${attemptNumber}`,
        question: `You're developing an e-commerce site where users can add items to cart rapidly. Multiple rapid clicks should not create duplicate cart items. What's the most robust solution?`,
        options: [
          "Implement debouncing with closure to delay execution and prevent rapid successive calls",
          "Disable the button after first click using setTimeout",
          "Use a global boolean flag to track button state",
          "Add items to array and remove duplicates later using filter"
        ],
        correct: 0,
        explanation: "Debouncing with closure provides the most robust solution by delaying execution until user stops clicking, preventing duplicate operations while maintaining good UX.",
        difficulty: 'medium',
        points: 10
      }
    )
  }
  
  // Generic advanced questions - always add these
  questions.push(
    {
      id: `${videoId}_adv_generic_1_${attemptNumber}`,
      question: `After learning the concepts in "${videoTitle}", you need to implement them in a production environment with high traffic. What's the most critical consideration for scalability?`,
      options: [
        "Performance optimization, error handling, and monitoring implementation with fallback strategies",
        "Using the latest technology stack regardless of team expertise",
        "Implementing all possible features to future-proof the solution",
        "Following tutorial examples exactly without modifications"
      ],
      correct: 0,
      explanation: "Production environments require robust performance optimization, comprehensive error handling, and monitoring systems with fallback strategies to handle high traffic and maintain reliability.",
      difficulty: 'hard',
      points: 15
    },
    {
      id: `${videoId}_adv_application_${attemptNumber}`,
      question: `A junior developer on your team watched "${videoTitle}" and implemented the concepts but the solution isn't working in edge cases. How should you approach code review and mentoring?`,
      options: [
        "Identify specific edge cases, explain the underlying principles, and guide them through problem-solving process",
        "Rewrite their code completely to show the correct implementation",
        "Tell them to watch more tutorials before attempting implementation",
        "Point out what's wrong without explaining why or how to fix it"
      ],
      correct: 0,
      explanation: "Effective mentoring involves identifying specific issues, explaining underlying principles, and guiding the learning process to help developers understand both the 'what' and 'why' of solutions.",
      difficulty: 'medium',
      points: 10
    }
  )
  
  // Add more generic questions if needed to reach questionCount
  while (questions.length < questionCount) {
    questions.push({
      id: `${videoId}_extra_${questions.length}_${attemptNumber}`,
      question: `Which best practice should you follow when applying concepts from "${videoTitle}" in a real project?`,
      options: [
        "Start with a solid understanding of fundamentals, then adapt techniques to your specific use case",
        "Copy and paste code examples directly without modifications",
        "Skip testing and optimization until after deployment",
        "Use the most complex solution available to impress your team"
      ],
      correct: 0,
      explanation: "Understanding fundamentals and adapting techniques to your specific needs leads to better, more maintainable solutions than blindly copying examples.",
      difficulty: 'easy',
      points: 5
    })
  }
  
  return questions.slice(0, questionCount)
}