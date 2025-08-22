// app/api/admin/transcripts/upload/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { videoId, transcriptData, source } = await request.json()

    if (!videoId || !transcriptData) {
      return NextResponse.json({ 
        error: "Missing required fields: videoId and transcriptData" 
      }, { status: 400 })
    }

    // Verify video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Parse transcript data based on source
    let segments: any[] = []

    if (source === 'vtt' || source === 'srt') {
      segments = parseSubtitleFile(transcriptData, source)
    } else if (source === 'json') {
      segments = JSON.parse(transcriptData)
    } else if (source === 'youtube') {
      segments = parseYouTubeTranscript(transcriptData)
    } else {
      // Plain text - create single segment
      segments = [{
        startTime: 0,
        endTime: video.duration || 3600,
        text: transcriptData,
        speakerName: null
      }]
    }

    // Delete existing transcript
    await prisma.transcriptSegment.deleteMany({
      where: { videoId }
    })

    // Create new transcript segments
    const createdSegments = await Promise.all(
      segments.map((segment, index) => 
        prisma.transcriptSegment.create({
          data: {
            videoId,
            startTime: segment.startTime,
            endTime: segment.endTime,
            text: segment.text.trim(),
            speakerName: segment.speakerName || null,
            order: index
          }
        })
      )
    )

    return NextResponse.json({
      message: "Transcript uploaded successfully",
      segments: createdSegments.length,
      videoId
    })

  } catch (error) {
    console.error("Error uploading transcript:", error)
    return NextResponse.json({ 
      error: "Failed to upload transcript",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function parseSubtitleFile(content: string, format: 'vtt' | 'srt'): any[] {
  const segments: any[] = []
  
  if (format === 'vtt') {
    // Parse WebVTT format
    const lines = content.split('\n')
    let currentSegment: any = null
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line.includes('-->')) {
        const [start, end] = line.split('-->').map(t => parseVTTTime(t.trim()))
        currentSegment = { startTime: start, endTime: end, text: '' }
      } else if (line && currentSegment && !line.startsWith('NOTE') && !line.startsWith('WEBVTT')) {
        currentSegment.text += (currentSegment.text ? ' ' : '') + line
      } else if (!line && currentSegment) {
        if (currentSegment.text) {
          segments.push(currentSegment)
        }
        currentSegment = null
      }
    }
    
    if (currentSegment && currentSegment.text) {
      segments.push(currentSegment)
    }
  } else if (format === 'srt') {
    // Parse SRT format
    const blocks = content.trim().split('\n\n')
    
    for (const block of blocks) {
      const lines = block.split('\n')
      if (lines.length >= 3) {
        const timeLine = lines[1]
        const textLines = lines.slice(2)
        
        if (timeLine.includes('-->')) {
          const [start, end] = timeLine.split('-->').map(t => parseSRTTime(t.trim()))
          segments.push({
            startTime: start,
            endTime: end,
            text: textLines.join(' ').trim()
          })
        }
      }
    }
  }
  
  return segments
}

function parseVTTTime(timeStr: string): number {
  const parts = timeStr.split(':')
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds)
  } else if (parts.length === 2) {
    const [minutes, seconds] = parts
    return parseInt(minutes) * 60 + parseFloat(seconds)
  }
  return 0
}

function parseSRTTime(timeStr: string): number {
  const [time, ms] = timeStr.split(',')
  const [hours, minutes, seconds] = time.split(':').map(Number)
  return hours * 3600 + minutes * 60 + seconds + (parseInt(ms) / 1000)
}

function parseYouTubeTranscript(data: any): any[] {
  // Parse YouTube transcript format
  if (Array.isArray(data)) {
    return data.map(item => ({
      startTime: item.start || 0,
      endTime: (item.start || 0) + (item.duration || 0),
      text: item.text || '',
      speakerName: null
    }))
  }
  return []
}

// app/api/admin/transcripts/generate/route.ts
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { videoId, audioUrl, language = 'en' } = await request.json()

    if (!videoId) {
      return NextResponse.json({ 
        error: "Missing videoId" 
      }, { status: 400 })
    }

    // Verify video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Here you would integrate with an AI transcription service
    // For example: OpenAI Whisper, Google Speech-to-Text, etc.
    
    // Placeholder for AI transcription
    const mockTranscript = [
      {
        startTime: 0,
        endTime: 30,
        text: "Welcome to this course. In this video, we'll be covering the fundamental concepts.",
        speakerName: "Instructor"
      },
      {
        startTime: 30,
        endTime: 60,
        text: "Let's start by understanding the basic principles and how they apply to real-world scenarios.",
        speakerName: "Instructor"
      }
    ]

    // Delete existing transcript
    await prisma.transcriptSegment.deleteMany({
      where: { videoId }
    })

    // Create new transcript segments
    const createdSegments = await Promise.all(
      mockTranscript.map((segment, index) => 
        prisma.transcriptSegment.create({
          data: {
            videoId,
            startTime: segment.startTime,
            endTime: segment.endTime,
            text: segment.text.trim(),
            speakerName: segment.speakerName,
            order: index
          }
        })
      )
    )

    return NextResponse.json({
      message: "Transcript generated successfully",
      segments: createdSegments.length,
      videoId,
      note: "This is a demo response. Integrate with real AI transcription service."
    })

  } catch (error) {
    console.error("Error generating transcript:", error)
    return NextResponse.json({ 
      error: "Failed to generate transcript",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}