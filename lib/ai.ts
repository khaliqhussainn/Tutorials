// lib/ai.ts - Enhanced AI test generation with better prompts
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface TestQuestion {
  question: string
  options: string[]
  correct: number
  explanation?: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export async function generateTestQuestions(
  videoTitle: string, 
  description: string, 
  aiPrompt: string,
  difficulty: 'mixed' | 'easy' | 'medium' | 'hard' = 'mixed',
  questionCount: number = 5
): Promise<TestQuestion[]> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('No Gemini API key found, using fallback questions')
    return generateFallbackQuestions(videoTitle, description, aiPrompt, questionCount)
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      }
    })
    
    const prompt = buildEnhancedPrompt(videoTitle, description, aiPrompt, difficulty, questionCount)
    
    console.log('Generating questions with enhanced AI prompt...')
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Parse JSON response with better error handling
    const questions = parseAIResponse(text)
    
    if (questions.length === 0) {
      throw new Error('AI generated no valid questions')
    }
    
    console.log(`Successfully generated ${questions.length} questions`)
    return questions.slice(0, questionCount) // Ensure we don't exceed requested count
    
  } catch (error) {
    console.error('AI generation error:', error)
    console.log('Falling back to template questions...')
    
    // Enhanced fallback questions based on the content
    return generateFallbackQuestions(videoTitle, description, aiPrompt, questionCount)
  }
}

function buildEnhancedPrompt(
  videoTitle: string, 
  description: string, 
  aiPrompt: string,
  difficulty: string,
  questionCount: number
): string {
  return `
You are an expert educational content creator tasked with generating high-quality quiz questions for an online learning platform.

CONTENT DETAILS:
- Video Title: "${videoTitle}"
- Video Description: "${description || 'No description provided'}"
- Learning Context: "${aiPrompt}"

REQUIREMENTS:
1. Generate exactly ${questionCount} multiple-choice questions
2. Difficulty level: ${difficulty === 'mixed' ? 'Mix of easy (40%), medium (40%), and hard (20%)' : difficulty}
3. Each question must have exactly 4 options (A, B, C, D)
4. Questions should test understanding, application, and critical thinking - not just memorization
5. Avoid questions that are too obvious or can be guessed without knowledge
6. Include variety: definitions, applications, examples, comparisons, and problem-solving
7. Make distractors (wrong answers) plausible but clearly incorrect for someone who knows the material

QUESTION TYPES TO INCLUDE:
- Conceptual understanding ("What is the main purpose of...")
- Application ("Which would be the best approach when...")
- Analysis ("Why does this technique work better than...")
- Evaluation ("What would happen if...")
- Comparison ("How does X differ from Y...")

RESPONSE FORMAT:
Return ONLY a valid JSON array with this exact structure:

[
  {
    "question": "Clear, specific question about the video content?",
    "options": [
      "Correct answer that demonstrates understanding",
      "Plausible but incorrect option",
      "Another plausible but incorrect option", 
      "Third plausible but incorrect option"
    ],
    "correct": 0,
    "explanation": "Brief explanation of why this answer is correct",
    "difficulty": "easy|medium|hard"
  }
]

IMPORTANT GUIDELINES:
- Base questions strictly on the provided content context
- Ensure questions are educational and promote learning
- Make sure all 4 options are reasonable length and grammatically correct
- Vary question complexity within the requested difficulty range
- Don't repeat similar questions
- Focus on key concepts, practical applications, and important details
- Avoid trick questions or overly complex wording

Generate the questions now:
  `.trim()
}

function parseAIResponse(text: string): TestQuestion[] {
  try {
    // Find JSON array in the response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('No JSON array found in AI response')
      return []
    }
    
    const questions = JSON.parse(jsonMatch[0])
    
    // Validate and clean up questions
    return questions
      .filter((q: any) => validateQuestion(q))
      .map((q: any) => ({
        question: q.question.trim(),
        options: q.options.map((opt: string) => opt.trim()),
        correct: Math.max(0, Math.min(3, parseInt(q.correct) || 0)), // Ensure valid index
        explanation: q.explanation?.trim() || '',
        difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium'
      }))
  } catch (error) {
    console.error('Failed to parse AI response:', error)
    return []
  }
}

function validateQuestion(question: any): boolean {
  return (
    question &&
    typeof question.question === 'string' &&
    question.question.length > 10 &&
    Array.isArray(question.options) &&
    question.options.length === 4 &&
    question.options.every((opt: any) => typeof opt === 'string' && opt.length > 0) &&
    typeof question.correct === 'number' &&
    question.correct >= 0 &&
    question.correct <= 3
  )
}

function generateFallbackQuestions(
  videoTitle: string, 
  description: string, 
  aiPrompt: string,
  questionCount: number
): TestQuestion[] {
  // Generate contextual fallback questions based on the prompt
  const questions: TestQuestion[] = []
  
  // Extract key terms and concepts from the prompts
  const content = `${videoTitle} ${description} ${aiPrompt}`.toLowerCase()
  const isHTMLContent = content.includes('html') || content.includes('markup') || content.includes('tag')
  const isCSSContent = content.includes('css') || content.includes('style') || content.includes('design')
  const isJSContent = content.includes('javascript') || content.includes('js') || content.includes('programming')
  const isPythonContent = content.includes('python') || content.includes('programming')
  const isWebContent = content.includes('web') || content.includes('website') || content.includes('browser')
  
  // Generate relevant questions based on detected content type
  if (isHTMLContent) {
    questions.push(
      {
        question: `Based on "${videoTitle}", what is the primary purpose of HTML in web development?`,
        options: [
          "To structure and organize content on web pages",
          "To add visual styling and colors to websites",
          "To create interactive functionality and animations",
          "To manage server-side database connections"
        ],
        correct: 0,
        explanation: "HTML (HyperText Markup Language) is primarily used for structuring and organizing content.",
        difficulty: 'easy'
      },
      {
        question: `According to the video content about "${aiPrompt}", which HTML element would be most appropriate for the main heading?`,
        options: [
          "<h1>",
          "<title>",
          "<header>", 
          "<main>"
        ],
        correct: 0,
        explanation: "The <h1> element represents the main heading of a page or section.",
        difficulty: 'medium'
      }
    )
  } else if (isCSSContent) {
    questions.push(
      {
        question: `What is the main concept covered in "${videoTitle}" regarding CSS?`,
        options: [
          "Styling and visual presentation of web pages",
          "Creating database schemas and relationships",
          "Writing server-side logic and APIs",
          "Managing file systems and directories"
        ],
        correct: 0,
        explanation: "CSS is used for styling and controlling the visual presentation of web pages.",
        difficulty: 'easy'
      },
      {
        question: `Based on the lesson about "${aiPrompt}", what is the correct way to apply CSS styles?`,
        options: [
          "Using selectors to target HTML elements",
          "Writing JavaScript functions",
          "Creating database queries",
          "Configuring server settings"
        ],
        correct: 0,
        explanation: "CSS uses selectors to target specific HTML elements for styling.",
        difficulty: 'medium'
      }
    )
  } else if (isJSContent || isPythonContent) {
    const language = isPythonContent ? 'Python' : 'JavaScript'
    questions.push(
      {
        question: `What programming concept is primarily covered in "${videoTitle}"?`,
        options: [
          `Core ${language} programming fundamentals`,
          "Database administration techniques",
          "Network security protocols",
          "Hardware configuration methods"
        ],
        correct: 0,
        explanation: `This video focuses on ${language} programming concepts and techniques.`,
        difficulty: 'easy'
      },
      {
        question: `According to the video about "${aiPrompt}", what should you focus on when learning this topic?`,
        options: [
          "Understanding the logic and practical application",
          "Memorizing syntax without context",
          "Copying code without understanding",
          "Avoiding hands-on practice"
        ],
        correct: 0,
        explanation: "Understanding logic and practical application is key to learning programming effectively.",
        difficulty: 'medium'
      }
    )
  } else {
    // Generic educational questions
    questions.push(
      {
        question: `What is the main learning objective of "${videoTitle}"?`,
        options: [
          "To understand and apply the concepts presented in the video",
          "To memorize specific details without context",
          "To complete the video without engaging with content",
          "To skip ahead to more advanced topics"
        ],
        correct: 0,
        explanation: "The main goal is to understand and be able to apply what you've learned.",
        difficulty: 'easy'
      },
      {
        question: `Based on the content about "${aiPrompt}", what would be the best next step after watching this video?`,
        options: [
          "Practice applying the concepts you learned",
          "Immediately move to unrelated topics",
          "Avoid practicing to save time",
          "Watch the video again without taking notes"
        ],
        correct: 0,
        explanation: "Active practice is essential for reinforcing learning and building skills.",
        difficulty: 'medium'
      }
    )
  }
  
  // Add a critical thinking question
  questions.push({
    question: `Why is it important to understand the concepts covered in "${videoTitle}" thoroughly?`,
    options: [
      "It builds a strong foundation for more advanced topics",
      "It's only useful for passing tests",
      "The concepts are rarely used in practice",
      "It's just academic theory with no real application"
    ],
    correct: 0,
    explanation: "Understanding fundamentals creates a solid foundation for learning more advanced concepts.",
    difficulty: 'hard'
  })
  
  // Add application question if we have enough context
  if (aiPrompt.length > 20) {
    questions.push({
      question: `How would you apply what you learned about "${aiPrompt}" in a real-world scenario?`,
      options: [
        "By practicing the techniques and adapting them to specific problems",
        "By following examples exactly without any modification",
        "By avoiding practical application until much later",
        "By focusing only on theoretical knowledge"
      ],
      correct: 0,
      explanation: "Real learning comes from practicing and adapting concepts to solve actual problems.",
      difficulty: 'hard'
    })
  }
  
  // Return the requested number of questions
  return questions.slice(0, questionCount)
}

// Enhanced function for regenerating questions with different parameters
export async function regenerateTestQuestions(
  videoId: string,
  videoTitle: string,
  description: string,
  aiPrompt: string,
  options: {
    difficulty?: 'mixed' | 'easy' | 'medium' | 'hard'
    questionCount?: number
    focusAreas?: string[]
    avoidTopics?: string[]
  } = {}
): Promise<TestQuestion[]> {
  const {
    difficulty = 'mixed',
    questionCount = 5,
    focusAreas = [],
    avoidTopics = []
  } = options
  
  // Enhanced prompt with additional parameters
  let enhancedPrompt = aiPrompt
  
  if (focusAreas.length > 0) {
    enhancedPrompt += `\n\nFocus especially on these areas: ${focusAreas.join(', ')}`
  }
  
  if (avoidTopics.length > 0) {
    enhancedPrompt += `\n\nAvoid questions about: ${avoidTopics.join(', ')}`
  }
  
  return generateTestQuestions(
    videoTitle,
    description,
    enhancedPrompt,
    difficulty,
    questionCount
  )
}

export type { TestQuestion }