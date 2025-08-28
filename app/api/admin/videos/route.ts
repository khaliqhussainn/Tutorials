import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TranscriptGenerator } from '@/lib/transcript-generator'
import { generateTestQuestions } from '@/lib/ai'
import { QuizHooks } from '@/hooks/quiz-hooks'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const {
      title,
      description,
      videoUrl,
      duration,
      order,
      courseId,
      sectionId,
      aiPrompt,
      generateTranscript = false,
      generateQuiz = true // Default to true for automatic quiz generation
    } = data

    console.log('Creating video with enhanced AI features:', {
      title,
      generateTranscript,
      generateQuiz,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasGemini: !!process.env.GEMINI_API_KEY
    })

    // Validate required fields
    if (!title || !videoUrl) {
      return NextResponse.json(
        { error: 'Title and video URL are required' },
        { status: 400 }
      )
    }

    // Get the next order number if not provided
    let finalOrder = order
    if (!finalOrder) {
      const condition = sectionId
        ? { sectionId }
        : { courseId, sectionId: null }

      const lastVideo = await prisma.video.findFirst({
        where: condition,
        orderBy: { order: 'desc' }
      })
      finalOrder = (lastVideo?.order || 0) + 1
    }

    // Create the video
    const createdVideo = await prisma.video.create({
      data: {
        title,
        description,
        videoUrl,
        duration,
        order: finalOrder,
        courseId,
        sectionId: sectionId || null,
        aiPrompt
      }
    })

    console.log(`✅ Video created: ${createdVideo.id}`)

    // Trigger quiz generation with integration hooks
    const hasTranscript: boolean = !!data.generateTranscript && (!!process.env.OPENAI_API_KEY || !!process.env.ASSEMBLYAI_API_KEY);
QuizHooks.onVideoUploaded(createdVideo.id, hasTranscript).catch(console.error);

    // LEGACY: Generate old-style AI tests if prompt provided (for backward compatibility)
    if (aiPrompt) {
      try {
        console.log('🧠 Generating legacy AI tests...')
        const questions = await generateTestQuestions(
          title,
          description || '',
          aiPrompt,
          'mixed',
          5
        )
        if (questions && questions.length > 0) {
          const createdTests = await Promise.all(
            questions.map((question, index) =>
              prisma.test.create({
                data: {
                  videoId: createdVideo.id,
                  question: question.question,
                  options: question.options,
                  correct: question.correct,
                  explanation: question.explanation,
                  difficulty: question.difficulty || 'medium',
                  points: 10, // Default points
                  order: index
                }
              })
            )
          )
          console.log(`✅ Created ${createdTests.length} legacy AI tests`)
        }
      } catch (error) {
        console.error('Legacy AI test generation failed:', error)
      }
    }

    // NEW: Enhanced quiz generation workflow
    if (generateQuiz) {
      console.log('🎯 Starting enhanced quiz generation workflow...')

      // Trigger quiz generation with integration hooks
      triggerVideoUploadHooks(createdVideo.id, {
        generateTranscript,
        generateQuiz,
        hasAIPrompt: !!aiPrompt
      }).catch(error => {
        console.error('Quiz generation workflow failed:', error)
      })
    }

    // Generate transcript if requested
    if (generateTranscript && (process.env.OPENAI_API_KEY || process.env.ASSEMBLYAI_API_KEY)) {
      try {
        console.log('🎬 Starting transcript generation...')

        const provider = process.env.ASSEMBLYAI_API_KEY ?
                        'assemblyai' :
                        process.env.OPENAI_API_KEY ?
                        'openai' : null

        if (provider) {
          const generator = new TranscriptGenerator(provider)

          // Start transcript generation in background
          generator.generateTranscript(createdVideo.id, videoUrl)
            .then(() => {
              console.log(`✅ Transcript generated for video: ${createdVideo.id}`)
            })
            .catch((error) => {
              console.error(`❌ Transcript generation failed for video ${createdVideo.id}:`, error)
            })

          console.log('🎬 Transcript generation started in background')
        } else {
          console.warn('No transcript provider available')
        }

      } catch (error) {
        console.error('Failed to start transcript generation:', error)
      }
    }

    // Return the created video with relations
    const videoWithRelations = await prisma.video.findUnique({
      where: { id: createdVideo.id },
      include: {
        tests: {
          orderBy: { order: 'asc' }
        },
        transcript: true,
        course: {
          select: { id: true, title: true }
        },
        section: {
          select: { id: true, title: true }
        }
      }
    })

    return NextResponse.json(videoWithRelations, { status: 201 })
  } catch (error) {
    console.error('Error creating video:', error)
    return NextResponse.json(
      { error: 'Failed to create video' },
      { status: 500 }
    )
  }
}

// NEW: Integration hooks function
async function triggerVideoUploadHooks(videoId: string, options: {
  generateTranscript?: boolean
  generateQuiz?: boolean
  hasAIPrompt?: boolean
}) {
  console.log(`🎬 Video upload hooks triggered for: ${videoId}`, options)
  try {
    // If quiz generation is requested but no transcript generation
    // Generate quiz immediately from video topic
    if (options.generateQuiz && !options.generateTranscript) {
      console.log('🧠 Starting immediate quiz generation from video topic...')

      // Small delay to ensure video is fully processed
      setTimeout(async () => {
        try {
          await generateQuizForVideo(videoId, 'topic')
        } catch (error) {
          console.error('Failed to generate quiz from video topic:', error)
        }
      }, 5000)
    }
    // If both transcript and quiz are requested
    // Quiz will be generated after transcript completion via transcript hook
    if (options.generateQuiz && options.generateTranscript) {
      console.log('📝 Quiz will be generated after transcript completion')
    }
    // If only quiz generation and we have AI prompt, generate immediately
    if (options.generateQuiz && !options.generateTranscript && options.hasAIPrompt) {
      console.log('🎯 Generating quiz from enhanced AI prompt...')

      setTimeout(async () => {
        try {
          await generateQuizForVideo(videoId, 'enhanced_topic')
        } catch (error) {
          console.error('Failed to generate enhanced quiz:', error)
        }
      }, 3000)
    }
  } catch (error) {
    console.error('Video upload hooks failed:', error)
  }
}

// NEW: Quiz generation helper function
async function generateQuizForVideo(videoId: string, method: 'topic' | 'transcript' | 'enhanced_topic') {
  try {
    console.log(`🧠 Generating quiz for video ${videoId} using method: ${method}`)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/admin/videos/${videoId}/generate-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method,
        source: 'video_upload'
      })
    })
    if (response.ok) {
      const result = await response.json()
      console.log(`✅ Quiz generated: ${result.count} questions created via ${method}`)
    } else {
      const error = await response.json()
      console.error('Quiz generation API error:', error)

      // Fallback to direct generation
      await generateQuizDirect(videoId)
    }
  } catch (error) {
    console.error('Quiz generation failed:', error)

    // Fallback to direct generation
    await generateQuizDirect(videoId)
  }
}

// NEW: Direct quiz generation fallback
async function generateQuizDirect(videoId: string) {
  try {
    console.log(`🔄 Attempting direct quiz generation for video: ${videoId}`)

    // Dynamic import to avoid circular dependencies
    const { TranscriptQuizGenerator } = await import('@/lib/quiz-generator')
    const generator = new TranscriptQuizGenerator()
    await generator.generateQuizFromVideo(videoId)

    console.log('✅ Direct quiz generation successful')
  } catch (error) {
    console.error('Direct quiz generation also failed:', error)
  }
}
