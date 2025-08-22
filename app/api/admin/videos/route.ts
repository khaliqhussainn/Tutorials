// app/api/admin/videos/route.ts
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
      generateTranscript = false 
    } = data

    console.log('Creating video with transcript support:', {
      title,
      generateTranscript,
      hasOpenAI: !!process.env.OPENAI_API_KEY
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
    const video = await prisma.video.create({
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

    console.log(`✅ Video created: ${video.id}`)

    // Generate AI tests if prompt provided
    if (aiPrompt) {
      try {
        console.log('🧠 Generating AI tests...')
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
                  videoId: video.id,
                  question: question.question,
                  options: question.options,
                  correct: question.correct,
                  explanation: question.explanation,
                  difficulty: question.difficulty || 'medium',
                  order: index
                }
              })
            )
          )

          console.log(`✅ Created ${createdTests.length} AI tests`)
        }
      } catch (error) {
        console.error('AI test generation failed:', error)
        // Continue without failing video creation
      }
    }

    // Generate transcript if requested and OpenAI is available
    if (generateTranscript && process.env.OPENAI_API_KEY) {
      try {
        console.log('🎬 Starting transcript generation...')
        
        // Start transcript generation in background
        const generator = new TranscriptGenerator('openai')
        
        // Don't await this - let it run in background
        generator.generateTranscript(video.id, videoUrl)
          .then(() => {
            console.log(`✅ Transcript generated for video: ${video.id}`)
          })
          .catch((error) => {
            console.error(`❌ Transcript generation failed for video ${video.id}:`, error)
          })
        
        console.log('🎬 Transcript generation started in background')
        
      } catch (error) {
        console.error('Failed to start transcript generation:', error)
        // Continue without failing video creation
      }
    }

    // Return the created video with relations
    const videoWithRelations = await prisma.video.findUnique({
      where: { id: video.id },
      include: {
        tests: true,
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