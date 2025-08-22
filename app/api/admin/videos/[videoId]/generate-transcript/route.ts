// app/api/admin/videos/[videoId]/generate-transcript/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import FormData from 'form-data'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Helper function to extract audio from video URL
async function extractAudioFromVideo(videoUrl: string): Promise<Buffer> {
  try {
    if (videoUrl.includes('cloudinary.com')) {
      const audioUrl = videoUrl.replace(/\.(mp4|mov|avi|mkv|webm)$/i, '.mp3')
      const response = await fetch(audioUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch audio from video')
      }
      return Buffer.from(await response.arrayBuffer())
    }
    throw new Error('Audio extraction not supported for this video source')
  } catch (error) {
    console.error('Error extracting audio:', error)
    throw error
  }
}

// Helper function to chunk large audio files
async function chunkAudioFile(audioBuffer: Buffer, maxSize: number = 24 * 1024 * 1024): Promise<Buffer[]> {
  if (audioBuffer.length <= maxSize) {
    return [audioBuffer]
  }
  const chunks: Buffer[] = []
  let offset = 0
  while (offset < audioBuffer.length) {
    const chunkSize = Math.min(maxSize, audioBuffer.length - offset)
    chunks.push(audioBuffer.slice(offset, offset + chunkSize))
    offset += chunkSize
  }
  return chunks
}

export async function POST(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }
    const { videoId } = params
    const body = await request.json()
    const { videoUrl, language = 'en', includeTimestamps = true, regenerate = false } = body

    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { course: true, section: true, transcript: true }
    })
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // If transcript exists and not regenerating
    if (video.transcript && !regenerate) {
      return NextResponse.json({
        message: 'Transcript already exists',
        transcript: video.transcript
      })
    }

    // Extract audio
    let audioBuffer: Buffer
    try {
      audioBuffer = await extractAudioFromVideo(videoUrl || video.videoUrl)
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to extract audio from video. Please ensure the video URL is accessible.' },
        { status: 400 }
      )
    }

    // Chunk audio
    const audioChunks = await chunkAudioFile(audioBuffer)
    let fullTranscript = ''
    let allSegments: any[] = []
    let totalOffset = 0

    // Process chunks
    for (let i = 0; i < audioChunks.length; i++) {
      const chunk = audioChunks[i]
      try {
        const transcription: any = await openai.audio.transcriptions.create({
  file: chunk,
  model: "whisper-1",
  language,
  response_format: includeTimestamps ? "verbose_json" : "text",
  timestamp_granularities: includeTimestamps ? ["segment"] : undefined,
});


        if (typeof transcription === 'string') {
          fullTranscript += (i > 0 ? ' ' : '') + transcription
        } else {
          fullTranscript += (i > 0 ? ' ' : '') + transcription.text
          if (transcription?.segments) {
            const adjustedSegments = transcription.segments.map((segment: any) => ({
              ...segment,
              start: segment.start + totalOffset,
              end: segment.end + totalOffset
            }))
            allSegments.push(...adjustedSegments)
          }
        }

        if (i < audioChunks.length - 1) {
          totalOffset += (chunk.length / audioBuffer.length) * (video.duration || 0)
        }
      } catch (error) {
        console.error(`Error transcribing chunk ${i}:`, error)
        throw new Error(`Failed to transcribe audio chunk ${i + 1}`)
      }
    }

    // Save transcript
    const transcriptData = {
      videoId,
      content: fullTranscript,
      language,
      segments: includeTimestamps ? allSegments : null,
      status: 'COMPLETED' as const,
      generatedAt: new Date()
    }

    let savedTranscript
    if (video.transcript) {
      savedTranscript = await prisma.transcript.update({
        where: { videoId },
        data: transcriptData
      })
    } else {
      savedTranscript = await prisma.transcript.create({
        data: transcriptData
      })
    }

    return NextResponse.json({
      message: 'Transcript generated successfully',
      transcript: savedTranscript,
      stats: {
        totalChunks: audioChunks.length,
        totalCharacters: fullTranscript.length,
        totalSegments: allSegments.length,
        language
      }
    })
  } catch (error) {
    console.error('Error generating transcript:', error)
    try {
      await prisma.transcript.upsert({
        where: { videoId: params.videoId },
        update: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        create: {
          videoId: params.videoId,
          content: '',
          language: 'en',
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    } catch (dbError) {
      console.error('Error updating transcript status:', dbError)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate transcript' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const transcript = await prisma.transcript.findUnique({
      where: { videoId: params.videoId },
      include: {
        video: { select: { title: true, duration: true } }
      }
    })
    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })
    }
    return NextResponse.json(transcript)
  } catch (error) {
    console.error('Error fetching transcript:', error)
    return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await prisma.transcript.delete({ where: { videoId: params.videoId } })
    return NextResponse.json({ message: 'Transcript deleted successfully' })
  } catch (error) {
    console.error('Error deleting transcript:', error)
    return NextResponse.json({ error: 'Failed to delete transcript' }, { status: 500 })
  }
}
