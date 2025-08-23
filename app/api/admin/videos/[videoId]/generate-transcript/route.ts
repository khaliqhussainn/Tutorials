// app/api/admin/videos/[videoId]/generate-transcript/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { Prisma } from 'prisma'


// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// ---------- Interfaces ----------
interface TranscriptSegment {
  start: number
  end: number
  text: string
  confidence?: number
  speaker?: string
}

interface VerboseTranscription {
  text: string
  segments?: {
    start: number
    end: number
    text: string
    avg_logprob?: number
  }[]
}

// ---------- Helpers ----------
async function extractAudioFromVideo(videoUrl: string): Promise<ArrayBuffer> {
  try {
    if (videoUrl.includes('cloudinary.com')) {
      const audioUrl = videoUrl.replace(/\.(mp4|mov|avi|mkv|webm)$/i, '.mp3')
      const response = await fetch(audioUrl)
      if (!response.ok) {
        const videoResponse = await fetch(videoUrl)
        if (!videoResponse.ok) throw new Error('Failed to fetch media from URL')
        return await videoResponse.arrayBuffer()
      }
      return await response.arrayBuffer()
    }
    const response = await fetch(videoUrl)
    if (!response.ok) throw new Error('Failed to fetch media from URL')
    return await response.arrayBuffer()
  } catch (error) {
    console.error('Error extracting audio:', error)
    throw error
  }
}

function createFileFromBuffer(buffer: ArrayBuffer, filename: string = 'audio.mp3'): File {
  return new File([buffer], filename, { type: 'audio/mpeg' })
}

// ---------- API Handlers ----------
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
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
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
    if (video.transcript && video.transcript.status === 'COMPLETED' && !regenerate) {
      return NextResponse.json({
        message: 'Transcript already exists',
        transcript: video.transcript
      })
    }

    // Update transcript status
    await prisma.transcript.upsert({
      where: { videoId },
      update: { status: 'PROCESSING', error: null },
      create: { videoId, content: '', language, status: 'PROCESSING' }
    })

    // Extract audio
    let audioBuffer: ArrayBuffer
    try {
      audioBuffer = await extractAudioFromVideo(videoUrl || video.videoUrl)
      console.log(`📁 Audio extracted: ${(audioBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`)
    } catch {
      await prisma.transcript.update({
        where: { videoId },
        data: { status: 'FAILED', error: 'Failed to extract audio from video' }
      })
      return NextResponse.json({ error: 'Failed to extract audio' }, { status: 400 })
    }

    // File size check (25MB limit)
    const maxFileSize = 25 * 1024 * 1024
    if (audioBuffer.byteLength > maxFileSize) {
      await prisma.transcript.update({
        where: { videoId },
        data: { status: 'FAILED', error: `File too large: ${(audioBuffer.byteLength / 1024 / 1024).toFixed(1)}MB` }
      })
      return NextResponse.json({ error: 'Audio too large (max 25MB)' }, { status: 400 })
    }

    // Convert buffer → File
    const audioFile = createFileFromBuffer(audioBuffer, `audio_${videoId}.mp3`)

    console.log(`🎤 Starting transcription with OpenAI Whisper...`)

    // -------- OpenAI Transcription --------
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language,
      response_format: includeTimestamps ? 'verbose_json' : 'text',
      timestamp_granularities: includeTimestamps ? ['segment'] : undefined,
    }) as VerboseTranscription | string  // 👈 fix: cast with our type

    let fullTranscript = ''
    let allSegments: TranscriptSegment[] = []

    if (typeof transcription === 'string') {
      fullTranscript = transcription
    } else {
      fullTranscript = transcription.text
      if (transcription.segments && includeTimestamps) {
        allSegments = transcription.segments.map(seg => ({
          start: seg.start,
          end: seg.end,
          text: seg.text.trim(),
          confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : null
        }))
      }
    }

    console.log(`✅ Transcription completed: ${fullTranscript.length} chars, ${allSegments.length} segments`)

    const transcriptData = {
  content: fullTranscript,
  language,
  segments: allSegments.length > 0 ? allSegments as Prisma.JsonArray : null, // ✅ FIX
  status: 'COMPLETED' as const,
  confidence: allSegments.length > 0
    ? allSegments.reduce((acc, seg) => acc + (seg.confidence || 0), 0) / allSegments.length
    : null,
  provider: 'openai',
  generatedAt: new Date(),
  error: null
}

const savedTranscript = await prisma.transcript.update({
  where: { videoId },
  data: transcriptData
})


    return NextResponse.json({
      success: true,
      message: 'Transcript generated successfully',
      transcript: savedTranscript,
      stats: {
        totalCharacters: fullTranscript.length,
        totalSegments: allSegments.length,
        language,
        confidence: transcriptData.confidence,
        provider: 'openai'
      }
    })

  } catch (error) {
    console.error('Error generating transcript:', error)
    try {
      await prisma.transcript.upsert({
        where: { videoId: params.videoId },
        update: { status: 'FAILED', error: error instanceof Error ? error.message : 'Unknown error' },
        create: { videoId: params.videoId, content: '', language: 'en', status: 'FAILED', error: error instanceof Error ? error.message : 'Unknown error' }
      })
    } catch (dbError) {
      console.error('Error updating transcript status:', dbError)
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate transcript' }, { status: 500 })
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
        video: { select: { title: true, duration: true, course: { select: { title: true } } } }
      }
    })

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found', videoId: params.videoId }, { status: 404 })
    }

    return NextResponse.json({ ...transcript, hasTranscript: transcript.status === 'COMPLETED' })
  } catch (error) {
    console.error('Error fetching transcript:', error)
    return NextResponse.json({ error: 'Failed to fetch transcript', videoId: params.videoId }, { status: 500 })
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

    const transcript = await prisma.transcript.findUnique({ where: { videoId: params.videoId } })
    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })
    }

    await prisma.transcript.delete({ where: { videoId: params.videoId } })
    return NextResponse.json({ success: true, message: 'Transcript deleted successfully', videoId: params.videoId })
  } catch (error) {
    console.error('Error deleting transcript:', error)
    return NextResponse.json({ error: 'Failed to delete transcript', videoId: params.videoId }, { status: 500 })
  }
}
