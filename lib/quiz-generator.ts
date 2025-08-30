// lib/quiz-generator.ts - COMPLETELY FIXED quiz generation logic
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

export class TranscriptQuizGenerator {
  private model: any

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.model = genAI.getGenerativeModel({ 
        model: 'gemini-pro',
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
        }
      })
    }
  }

  async generateQuizFromVideo(videoId: string): Promise<QuizQuestion[]> {
    console.log(`Starting quiz generation for video: ${videoId}`)
    
    try {
      // Get video with complete data
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
      let generationMethod = ''

      // METHOD 1: Generate from transcript (HIGHEST PRIORITY)
      if (this.shouldUseTranscript(video.transcript)) {
        console.log(`Using transcript for quiz generation (${video.transcript!.content!.length} chars)`)
        try {
          questions = await this.generateFromTranscript(
            video.transcript!.content!,
            video.title,
            video.description || '',
            video.course?.category || '',
            video.course?.level || 'INTERMEDIATE'
          )
          generationMethod = 'transcript'
          
          if (questions.length >= 5) {
            console.log(`Generated ${questions.length} questions from transcript`)
            await this.saveQuestionsToDatabase(videoId, questions, generationMethod)
            return questions
          } else {
            console.warn(`Transcript generation produced only ${questions.length} questions, falling back`)
          }
        } catch (error) {
          console.warn('Transcript generation failed, falling back to topic method:', error)
        }
      }

      // METHOD 2: Generate from video topic (FALLBACK)
      console.log('Using topic-based generation as fallback')
      questions = await this.generateFromVideoTopic(
        video.title,
        video.description || '',
        video.aiPrompt || '',
        video.course?.category || '',
        video.course?.level || 'INTERMEDIATE'
      )
      generationMethod = 'topic'

      if (questions.length > 0) {
        console.log(`Generated ${questions.length} questions from topic`)
        await this.saveQuestionsToDatabase(videoId, questions, generationMethod)
        return questions
      }

      throw new Error('Failed to generate questions using all available methods')

    } catch (error) {
      console.error('Quiz generation error:', error)
      throw error
    }
  }

  private shouldUseTranscript(transcript: any): boolean {
    return !!(
      transcript &&
      transcript.status === 'COMPLETED' &&
      transcript.content &&
      transcript.content.trim().length > 100 &&
      transcript.confidence &&
      transcript.confidence > 0.5
    )
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

    const processedTranscript = this.preprocessTranscript(transcript)
    
    const prompt = `
You are an expert educational content creator. Create a comprehensive quiz based EXCLUSIVELY on the video transcript provided.

VIDEO DETAILS:
- Title: "${videoTitle}"
- Description: "${videoDescription}"
- Category: ${category}
- Level: ${level}

TRANSCRIPT CONTENT:
${processedTranscript}

QUIZ REQUIREMENTS:
1. Generate exactly 8 multiple-choice questions
2. Base ALL questions DIRECTLY on content from the transcript
3. Difficulty distribution: 2 easy, 4 medium, 2 hard questions
4. Each question has exactly 4 options (A, B, C, D)
5. Reference specific transcript content in questions
6. Make distractors plausible but clearly wrong

CRITICAL: Only use information explicitly mentioned in the transcript. Quote specific phrases when possible.

Return ONLY valid JSON in this format:
[
  {
    "question": "According to the transcript, what is [specific concept mentioned]?",
    "options": [
      "Correct answer from transcript",
      "Plausible but incorrect option",
      "Another plausible distractor",
      "Third plausible distractor"
    ],
    "correct": 0,
    "explanation": "The transcript states: '[brief quote]', which explains why this is correct.",
    "difficulty": "easy",
    "points": 10
  }
]

Generate the quiz now:`

    const result = await this.model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return this.parseAIResponse(text)
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

    const prompt = `
You are an expert educational content creator. Create a quiz for this educational video.

VIDEO DETAILS:
- Title: "${videoTitle}"
- Description: "${videoDescription}"
- AI Context: "${aiPrompt}"
- Category: ${category}
- Level: ${level}

REQUIREMENTS:
1. Generate exactly 8 multiple-choice questions
2. Difficulty: 2 easy, 4 medium, 2 hard questions
3. Each question has exactly 4 options
4. Focus on practical application and understanding
5. Include real-world scenarios relevant to the topic

Return ONLY valid JSON:
[
  {
    "question": "What is the primary purpose of [topic concept]?",
    "options": [
      "Correct answer",
      "Plausible incorrect option",
      "Another incorrect option",
      "Third incorrect option"
    ],
    "correct": 0,
    "explanation": "Detailed explanation of correct answer",
    "difficulty": "easy",
    "points": 10
  }
]

Generate the quiz now:`

    const result = await this.model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return this.parseAIResponse(text)
  }

  private preprocessTranscript(transcript: string): string {
    let processed = transcript.replace(/\s+/g, ' ').trim()
    
    // Intelligent truncation for long transcripts
    if (processed.length > 8000) {
      const sections = [
        processed.substring(0, 2500),
        processed.substring(Math.floor(processed.length * 0.4), Math.floor(processed.length * 0.6)),
        processed.substring(processed.length - 2500)
      ]
      processed = sections.join('\n\n[...continuing...]\n\n')
    }
    
    return processed
  }

  private parseAIResponse(text: string): QuizQuestion[] {
    try {
      let jsonText = text.trim()
      
      // Clean response
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '')
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```$/, '')
      }
      
      // Extract JSON array
      const jsonMatch = jsonText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('No JSON array found in AI response')
      }
      
      const questions = JSON.parse(jsonMatch[0])
      
      // Validate and clean questions
      const validQuestions = questions
        .filter((q: any) => this.validateQuestion(q))
        .map((q: any, index: number) => ({
          question: q.question.trim(),
          options: q.options.map((opt: string) => opt.trim()),
          correct: Math.max(0, Math.min(3, parseInt(q.correct) || 0)),
          explanation: q.explanation?.trim() || 'No explanation provided.',
          difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
          points: q.points || 10,
          order: index + 1
        }))

      if (validQuestions.length === 0) {
        throw new Error('No valid questions generated from AI response')
      }

      console.log(`Validated ${validQuestions.length} questions`)
      return validQuestions
      
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      throw new Error('Failed to parse quiz questions from AI response')
    }
  }

  private validateQuestion(question: any): boolean {
    const isValid = (
      question &&
      typeof question.question === 'string' &&
      question.question.length > 10 &&
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      question.options.every((opt: any) => typeof opt === 'string' && opt.trim().length > 0) &&
      typeof question.correct === 'number' &&
      question.correct >= 0 &&
      question.correct <= 3 &&
      question.explanation &&
      typeof question.explanation === 'string' &&
      question.explanation.length > 10
    )

    if (!isValid) {
      console.warn('Invalid question detected:', {
        hasQuestion: !!question?.question,
        questionLength: question?.question?.length || 0,
        hasOptions: Array.isArray(question?.options),
        optionsCount: question?.options?.length || 0,
        hasCorrect: typeof question?.correct === 'number',
        correctValue: question?.correct
      })
    }

    return isValid
  }

  private async saveQuestionsToDatabase(
    videoId: string, 
    questions: QuizQuestion[], 
    method: string
  ): Promise<void> {
    try {
      // Delete existing questions
      const deletedCount = await prisma.test.deleteMany({
        where: { videoId }
      })

      console.log(`Deleted ${deletedCount.count} existing questions for video ${videoId}`)

      // Create new questions with proper ordering
      const createdQuestions = []
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        const created = await prisma.test.create({
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
        createdQuestions.push(created)
      }

      console.log(`Saved ${createdQuestions.length} questions using ${method} method`)
    } catch (error) {
      console.error('Failed to save questions to database:', error)
      throw error
    }
  }

  // Static methods for hooks
  static async onVideoUpload(videoId: string, hasTranscript = false): Promise<void> {
    console.log(`Video uploaded: ${videoId}, transcript available: ${hasTranscript}`)
    const generator = new TranscriptQuizGenerator()
    
    if (hasTranscript) {
      try {
        await generator.generateQuizFromVideo(videoId)
      } catch (error) {
        console.error('Failed to generate quiz on upload:', error)
      }
    } else {
      // Delayed generation to allow for transcript processing
      setTimeout(async () => {
        try {
          await generator.generateQuizFromVideo(videoId)
        } catch (error) {
          console.error('Failed to generate delayed quiz:', error)
        }
      }, 45000) // 45 seconds delay
    }
  }

  static async onTranscriptCompleted(videoId: string): Promise<void> {
    console.log(`Transcript completed for video ${videoId}, regenerating quiz...`)
    
    // Add delay to ensure transcript is fully saved
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const generator = new TranscriptQuizGenerator()
    
    try {
      await generator.generateQuizFromVideo(videoId)
      console.log(`Quiz successfully regenerated from transcript`)
    } catch (error) {
      console.error('Failed to regenerate quiz after transcript:', error)
    }
  }

  async generateQuizForAllVideos(): Promise<void> {
    try {
      const videos = await prisma.video.findMany({
        where: {
          tests: {
            none: {}
          }
        },
        include: {
          transcript: {
            select: { status: true, content: true }
          },
          course: {
            select: { title: true, category: true, level: true }
          }
        },
        take: 50
      })

      console.log(`Found ${videos.length} videos without quizzes`)

      for (const video of videos) {
        try {
          console.log(`Processing: ${video.title}`)
          await this.generateQuizFromVideo(video.id)
          
          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 5000))
          
        } catch (error) {
          console.error(`Failed to generate quiz for ${video.title}:`, error)
        }
      }

      console.log('Completed batch quiz generation')
    } catch (error) {
      console.error('Batch quiz generation failed:', error)
      throw error
    }
  }
}
