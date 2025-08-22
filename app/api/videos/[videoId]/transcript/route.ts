// app/api/videos/[videoId]/transcript/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

interface TranscriptSegment {
  id: string
  startTime: number
  endTime: number
  text: string
  speakerName?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { videoId } = params

    // First, check if user has access to this video
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        course: {
          include: {
            enrollments: {
              where: {
                user: { email: session.user.email }
              }
            }
          }
        }
      }
    })

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Check if user is enrolled in the course
    if (video.course.enrollments.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Try to get transcript from database first
    const existingTranscript = await prisma.transcript.findUnique({
      where: { videoId },
      include: {
        segments: {
          orderBy: { startTime: 'asc' }
        }
      }
    })

    if (existingTranscript && existingTranscript.segments.length > 0) {
      // Return existing transcript segments
      const segments: TranscriptSegment[] = existingTranscript.segments.map(segment => ({
        id: segment.id,
        startTime: segment.startTime,
        endTime: segment.endTime,
        text: segment.text,
        speakerName: segment.speakerName || undefined
      }))

      return NextResponse.json({
        videoId,
        segments,
        language: existingTranscript.language || 'en',
        generatedAt: existingTranscript.createdAt
      })
    }

    // If no transcript exists, try to generate one
    if (video.videoUrl) {
      try {
        const generatedTranscript = await generateTranscriptForVideo(video.videoUrl, videoId)
        
        if (generatedTranscript) {
          return NextResponse.json({
            videoId,
            segments: generatedTranscript.segments,
            language: generatedTranscript.language || 'en',
            generatedAt: new Date()
          })
        }
      } catch (error) {
        console.error('Error generating transcript:', error)
        // Continue to return empty transcript rather than failing
      }
    }

    // Return empty transcript if nothing is available
    return NextResponse.json({
      videoId,
      segments: [],
      language: 'en',
      generatedAt: null
    })

  } catch (error) {
    console.error('Error fetching transcript:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Function to generate transcript using your preferred service
async function generateTranscriptForVideo(videoUrl: string, videoId: string): Promise<{
  segments: TranscriptSegment[]
  language: string
} | null> {
  try {
    // Option 1: Using AssemblyAI (recommended)
    if (process.env.ASSEMBLYAI_API_KEY) {
      return await generateWithAssemblyAI(videoUrl, videoId)
    }
    
    // Option 2: Using OpenAI Whisper API
    if (process.env.OPENAI_API_KEY) {
      return await generateWithOpenAI(videoUrl, videoId)
    }
    
    // Option 3: Using Google Speech-to-Text
    if (process.env.GOOGLE_CLOUD_API_KEY) {
      return await generateWithGoogle(videoUrl, videoId)
    }

    return null
  } catch (error) {
    console.error('Error in transcript generation:', error)
    return null
  }
}

// AssemblyAI implementation
async function generateWithAssemblyAI(videoUrl: string, videoId: string): Promise<{
  segments: TranscriptSegment[]
  language: string
} | null> {
  try {
    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ASSEMBLYAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: videoUrl,
        auto_chapters: false,
        speaker_labels: true,
        language_detection: true
      })
    })

    const transcriptRequest = await response.json()
    
    if (!transcriptRequest.id) {
      throw new Error('Failed to submit transcript request')
    }

    // Poll for completion
    let transcript = null
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      
      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptRequest.id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.ASSEMBLYAI_API_KEY}`
        }
      })
      
      transcript = await statusResponse.json()
      
      if (transcript.status === 'completed') {
        break
      } else if (transcript.status === 'error') {
        throw new Error('Transcript generation failed')
      }
      
      attempts++
    }

    if (!transcript || transcript.status !== 'completed') {
      throw new Error('Transcript generation timed out')
    }

    // Convert to our format and save to database
    const segments: TranscriptSegment[] = transcript.utterances?.map((utterance: any, index: number) => ({
      id: `${videoId}-${index}`,
      startTime: utterance.start / 1000, // Convert ms to seconds
      endTime: utterance.end / 1000,
      text: utterance.text,
      speakerName: `Speaker ${utterance.speaker}`
    })) || []

    // Save to database
    await saveTranscriptToDatabase(videoId, segments, transcript.language_code || 'en')

    return {
      segments,
      language: transcript.language_code || 'en'
    }

  } catch (error) {
    console.error('AssemblyAI error:', error)
    return null
  }
}

// OpenAI Whisper implementation (for audio extraction from video, you'd need ffmpeg)
async function generateWithOpenAI(videoUrl: string, videoId: string): Promise<{
  segments: TranscriptSegment[]
  language: string
} | null> {
  try {
    // This is a simplified version - you'd need to:
    // 1. Extract audio from video using ffmpeg
    // 2. Split into chunks if > 25MB
    // 3. Send to OpenAI Whisper API
    
    console.log('OpenAI Whisper integration would go here')
    return null
  } catch (error) {
    console.error('OpenAI error:', error)
    return null
  }
}

// Google Speech-to-Text implementation
async function generateWithGoogle(videoUrl: string, videoId: string): Promise<{
  segments: TranscriptSegment[]
  language: string
} | null> {
  try {
    // Google Speech-to-Text implementation would go here
    console.log('Google Speech-to-Text integration would go here')
    return null
  } catch (error) {
    console.error('Google error:', error)
    return null
  }
}

// Save transcript to database
async function saveTranscriptToDatabase(videoId: string, segments: TranscriptSegment[], language: string) {
  try {
    // Create transcript record
    const transcript = await prisma.transcript.create({
      data: {
        videoId,
        language,
        status: 'completed'
      }
    })

    // Create transcript segments
    await prisma.transcriptSegment.createMany({
      data: segments.map(segment => ({
        transcriptId: transcript.id,
        startTime: segment.startTime,
        endTime: segment.endTime,
        text: segment.text,
        speakerName: segment.speakerName
      }))
    })

  } catch (error) {
    console.error('Error saving transcript to database:', error)
  }
}