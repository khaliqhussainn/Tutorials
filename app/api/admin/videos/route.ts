import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TranscriptGenerator } from '@/lib/transcript-generator'
import { generateTestQuestions } from '@/lib/ai'

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
      generateQuiz = true
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
    
    if (finalOrder === undefined || finalOrder === null) {
      // Always find the highest order across the ENTIRE course
      const lastVideo = await prisma.video.findFirst({
        where: { courseId },
        orderBy: { order: 'desc' }
      })
      
      // Start from 0 if no videos exist, otherwise increment
      finalOrder = lastVideo ? lastVideo.order + 1 : 0
      
      console.log(`📊 Auto-assigned order ${finalOrder} for course ${courseId}`)
    } else {
      // If order is manually provided, check for conflicts
      const conflictingVideo = await prisma.video.findFirst({
        where: {
          courseId,
          order: finalOrder
        }
      })
      
      if (conflictingVideo) {
        // Find next available order instead
        const lastVideo = await prisma.video.findFirst({
          where: { courseId },
          orderBy: { order: 'desc' }
        })
        
        const suggestedOrder = lastVideo ? lastVideo.order + 1 : 0
        
        console.warn(`⚠️ Order ${finalOrder} already exists in course. Using order ${suggestedOrder}`)
        finalOrder = suggestedOrder
      }
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

    // Generate transcript if requested
    if (generateTranscript && (process.env.OPENAI_API_KEY || process.env.ASSEMBLYAI_API_KEY)) {
      try {
        console.log('🎬 Starting transcript generation...')

        const provider = process.env.ASSEMBLYAI_API_KEY 
          ? 'assemblyai' 
          : process.env.OPENAI_API_KEY 
          ? 'openai' 
          : null

        if (provider) {
          const generator = new TranscriptGenerator(provider)

          // Start transcript generation in background
          generator.generateTranscript(createdVideo.id, videoUrl)
            .then(() => {
              console.log(`✅ Transcript generated for video: ${createdVideo.id}`)
              
              // Generate quiz after transcript is complete
              if (generateQuiz) {
                console.log('📝 Generating quiz from transcript...')
                generateQuizForVideo(createdVideo.id, 'transcript').catch(console.error)
              }
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

    // Generate quiz immediately if no transcript generation
    if (generateQuiz && !generateTranscript) {
      console.log('🧠 Starting immediate quiz generation from video topic...')
      
      // Small delay to ensure video is fully committed to DB
      setTimeout(() => {
        generateQuizForVideo(createdVideo.id, 'topic').catch(console.error)
      }, 2000)
    }

    // LEGACY: Generate old-style AI tests if prompt provided
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
                  points: 10,
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

// Quiz generation helper function
async function generateQuizForVideo(videoId: string, method: 'topic' | 'transcript') {
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

// Direct quiz generation fallback
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