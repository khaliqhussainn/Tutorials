// lib/quiz-generator.ts - Generate quizzes from transcripts with fallback
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from './prisma'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface QuizQuestion {
  question: string
  options: string[]
  correct: number
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
}

interface TranscriptSegment {
  start: number
  end: number
  text: string
  confidence?: number
  speaker?: string
}

export class TranscriptQuizGenerator {
  private model: any

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.model = genAI.getGenerativeModel({ 
        model: 'gemini-pro',
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
        }
      })
    }
  }

  async generateQuizFromVideo(videoId: string): Promise<QuizQuestion[]> {
    console.log(`🧠 Starting quiz generation for video: ${videoId}`)
    
    try {
      // Get video with transcript
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          transcript: true,
          course: {
            select: {
              title: true,
              category: true,
              level: true
            }
          }
        }
      })

      if (!video) {
        throw new Error('Video not found')
      }

      let questions: QuizQuestion[] = []

      // Method 1: Generate from transcript (preferred)
      if (video.transcript?.status === 'COMPLETED' && video.transcript.content) {
        console.log('📝 Generating questions from transcript...')
        try {
          questions = await this.generateFromTranscript(
            video.transcript.content,
            video.title,
            video.description || '',
            video.course?.category || '',
            video.course?.level || 'INTERMEDIATE'
          )
          
          if (questions.length >= 5) {
            console.log(`✅ Generated ${questions.length} questions from transcript`)
            await this.saveQuestionsToDatabase(videoId, questions)
            return questions
          }
        } catch (error) {
          console.warn('Failed to generate from transcript, falling back to video topic:', error)
        }
      }

      // Method 2: Fallback to video topic generation
      console.log('🎯 Falling back to topic-based question generation...')
      questions = await this.generateFromVideoTopic(
        video.title,
        video.description || '',
        video.aiPrompt || '',
        video.course?.category || '',
        video.course?.level || 'INTERMEDIATE'
      )

      if (questions.length > 0) {
        console.log(`✅ Generated ${questions.length} questions from video topic`)
        await this.saveQuestionsToDatabase(videoId, questions)
        return questions
      }

      throw new Error('Failed to generate questions using both methods')

    } catch (error) {
      console.error('Quiz generation error:', error)
      throw error
    }
  }

  private async generateFromTranscript(
    transcript: string,
    videoTitle: string,
    videoDescription: string,
    category: string,
    level: string
  ): Promise<QuizQuestion[]> {
    if (!this.model) {
      throw new Error('Gemini API not configured')
    }

    const prompt = this.buildTranscriptPrompt(
      transcript,
      videoTitle,
      videoDescription,
      category,
      level
    )

    const result = await this.model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return this.parseAIResponse(text)
  }

  private buildTranscriptPrompt(
    transcript: string,
    videoTitle: string,
    videoDescription: string,
    category: string,
    level: string
  ): string {
    // Truncate transcript if too long (keep most important parts)
    const processedTranscript = this.preprocessTranscript(transcript)
    
    return `
You are an expert educational content creator. Create a comprehensive quiz based on the video transcript provided.

VIDEO DETAILS:
- Title: "${videoTitle}"
- Description: "${videoDescription}"
- Category: ${category}
- Level: ${level}

TRANSCRIPT CONTENT:
${processedTranscript}

QUIZ REQUIREMENTS:
1. Generate exactly 8 multiple-choice questions
2. Base ALL questions directly on the transcript content
3. Question difficulty distribution:
   - 2 Easy questions (basic concepts and definitions)
   - 4 Medium questions (application and understanding)
   - 2 Hard questions (analysis, evaluation, and complex scenarios)
4. Each question must have exactly 4 options (A, B, C, D)
5. Make distractors plausible but clearly incorrect for someone who understood the content
6. Include detailed explanations for correct answers

QUESTION TYPES TO INCLUDE:
- Key concepts and definitions mentioned in the transcript
- Specific examples or case studies discussed
- Step-by-step processes or methodologies explained
- Important details and facts presented
- Applications and practical uses mentioned
- Cause-and-effect relationships explained
- Comparisons made in the content
- Problem-solving approaches demonstrated

RESPONSE FORMAT:
Return ONLY a valid JSON array with this structure:

[
  {
    "question": "Based on the transcript, what is [specific concept mentioned]?",
    "options": [
      "Correct answer based on transcript content",
      "Plausible but incorrect option",
      "Another plausible but incorrect option",
      "Third plausible but incorrect option"
    ],
    "correct": 0,
    "explanation": "According to the transcript, this is correct because [specific reference to transcript content]",
    "difficulty": "easy|medium|hard",
    "points": 10
  }
]

IMPORTANT GUIDELINES:
- Quote or reference specific parts of the transcript in questions when possible
- Ensure questions test comprehension of the actual content presented
- Avoid questions that require external knowledge not in the transcript
- Make explanations educational and reference the transcript content
- Vary question complexity within each difficulty level
- Focus on the most important and emphasized points in the transcript

Generate the quiz now:
`.trim()
  }

  private async generateFromVideoTopic(
    videoTitle: string,
    videoDescription: string,
    aiPrompt: string,
    category: string,
    level: string
  ): Promise<QuizQuestion[]> {
    if (!this.model) {
      throw new Error('Gemini API not configured')
    }

    const prompt = this.buildTopicPrompt(
      videoTitle,
      videoDescription,
      aiPrompt,
      category,
      level
    )

    const result = await this.model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return this.parseAIResponse(text)
  }

  private buildTopicPrompt(
    videoTitle: string,
    videoDescription: string,
    aiPrompt: string,
    category: string,
    level: string
  ): string {
    return `
You are an expert educational content creator. Create a comprehensive quiz for an educational video.

VIDEO DETAILS:
- Title: "${videoTitle}"
- Description: "${videoDescription}"
- AI Prompt Context: "${aiPrompt}"
- Category: ${category}
- Level: ${level}

QUIZ REQUIREMENTS:
1. Generate exactly 8 multiple-choice questions
2. Question difficulty distribution:
   - 2 Easy questions (basic concepts, definitions)
   - 4 Medium questions (application, understanding, examples)
   - 2 Hard questions (analysis, evaluation, complex problem-solving)
3. Each question must have exactly 4 options (A, B, C, D)
4. Create questions that would naturally arise from this topic
5. Include practical applications and real-world scenarios
6. Test both theoretical understanding and practical application

QUESTION CATEGORIES TO COVER:
- Fundamental concepts and definitions
- Key principles and rules
- Practical applications and use cases
- Common mistakes and misconceptions
- Best practices and recommendations
- Problem-solving scenarios
- Comparative analysis
- Advanced techniques and optimizations

RESPONSE FORMAT:
Return ONLY a valid JSON array:

[
  {
    "question": "Clear, specific question about the topic?",
    "options": [
      "Correct answer demonstrating understanding",
      "Plausible but incorrect option",
      "Another plausible but incorrect option",
      "Third plausible but incorrect option"
    ],
    "correct": 0,
    "explanation": "Comprehensive explanation of why this is correct and why others are wrong",
    "difficulty": "easy|medium|hard",
    "points": 10
  }
]

GUIDELINES:
- Make questions progressively challenging
- Include scenario-based questions for practical application
- Ensure all questions are relevant to the specified topic and level
- Create educational explanations that reinforce learning
- Test understanding rather than memorization
- Include current best practices and industry standards where applicable

Generate the quiz now:
`.trim()
  }

  private preprocessTranscript(transcript: string): string {
    // Remove excessive whitespace and normalize
    let processed = transcript.replace(/\s+/g, ' ').trim()
    
    // If transcript is too long (>8000 chars), intelligently truncate
    if (processed.length > 8000) {
      // Try to keep the first 2000 chars, middle 4000 chars, and last 2000 chars
      const start = processed.substring(0, 2000)
      const middle = processed.substring(
        Math.floor((processed.length - 4000) / 2), 
        Math.floor((processed.length + 4000) / 2)
      )
      const end = processed.substring(processed.length - 2000)
      
      processed = `${start}...\n\n[MIDDLE SECTION]\n${middle}\n\n[FINAL SECTION]\n${end}`
    }
    
    return processed
  }

  private parseAIResponse(text: string): QuizQuestion[] {
    try {
      // Find JSON array in the response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('No JSON array found in AI response')
      }
      
      const questions = JSON.parse(jsonMatch[0])
      
      // Validate and clean questions
      return questions
        .filter((q: any) => this.validateQuestion(q))
        .map((q: any) => ({
          question: q.question.trim(),
          options: q.options.map((opt: string) => opt.trim()),
          correct: Math.max(0, Math.min(3, parseInt(q.correct) || 0)),
          explanation: q.explanation?.trim() || 'No explanation provided.',
          difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
          points: q.points || 10
        }))
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      throw new Error('Failed to parse quiz questions from AI response')
    }
  }

  private validateQuestion(question: any): boolean {
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

  private async saveQuestionsToDatabase(videoId: string, questions: QuizQuestion[]): Promise<void> {
    try {
      // Delete existing questions for this video
      await prisma.test.deleteMany({
        where: { videoId }
      })

      // Create new questions
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        await prisma.test.create({
          data: {
            videoId,
            question: question.question,
            options: question.options,
            correct: question.correct,
            explanation: question.explanation,
            difficulty: question.difficulty,
            points: question.points,
            order: i + 1
          }
        })
      }

      console.log(`💾 Saved ${questions.length} questions to database for video ${videoId}`)
    } catch (error) {
      console.error('Failed to save questions to database:', error)
      throw error
    }
  }

  // Public method to regenerate quiz for a video
  async regenerateQuiz(videoId: string): Promise<QuizQuestion[]> {
    return this.generateQuizFromVideo(videoId)
  }

  // Generate quiz for all videos that don't have questions
  async generateQuizForAllVideos(): Promise<void> {
    try {
      const videos = await prisma.video.findMany({
        where: {
          tests: {
            none: {}
          }
        },
        include: {
          transcript: true,
          course: {
            select: {
              title: true,
              category: true,
              level: true
            }
          }
        },
        take: 50 // Process in batches
      })

      console.log(`🎯 Found ${videos.length} videos without quizzes`)

      for (const video of videos) {
        try {
          console.log(`Processing video: ${video.title}`)
          await this.generateQuizFromVideo(video.id)
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 3000))
          
        } catch (error) {
          console.error(`Failed to generate quiz for video ${video.title}:`, error)
          // Continue with next video
        }
      }

      console.log('✅ Completed batch quiz generation')
    } catch (error) {
      console.error('Batch quiz generation failed:', error)
      throw error
    }
  }

  // Hook to automatically generate quiz when video is uploaded
  static async onVideoUpload(videoId: string, hasTranscript = false): Promise<void> {
    const generator = new TranscriptQuizGenerator()
    
    if (hasTranscript) {
      // Generate immediately if transcript exists
      try {
        await generator.generateQuizFromVideo(videoId)
      } catch (error) {
        console.error('Failed to generate quiz on video upload:', error)
      }
    } else {
      // Wait a bit for transcript to potentially be generated, then create topic-based quiz
      setTimeout(async () => {
        try {
          await generator.generateQuizFromVideo(videoId)
        } catch (error) {
          console.error('Failed to generate delayed quiz:', error)
        }
      }, 30000) // Wait 30 seconds
    }
  }

  // Hook to regenerate quiz when transcript is completed
  static async onTranscriptCompleted(videoId: string): Promise<void> {
    const generator = new TranscriptQuizGenerator()
    
    try {
      console.log(`📝 Transcript completed for video ${videoId}, regenerating quiz...`)
      await generator.generateQuizFromVideo(videoId)
    } catch (error) {
      console.error('Failed to regenerate quiz after transcript completion:', error)
    }
  }
}