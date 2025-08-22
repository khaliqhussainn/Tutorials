// app/api/upload/route.ts - Updated with transcript support

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import cloudinary from "@/lib/cloudinary"
import { TranscriptGenerator } from "@/lib/jobs/generateTranscripts"

export const maxDuration = 300 // 5 minutes
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  console.log('=== VIDEO UPLOAD WITH TRANSCRIPT SUPPORT STARTED ===')
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File
    const generateTranscript = data.get('generateTranscript') === 'true'
    const videoId = data.get('videoId') as string // Get videoId if provided
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    console.log('File details:', {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      type: file.type,
      generateTranscript,
      videoId
    })

    // Validate file
    const maxSize = 200 * 1024 * 1024 // 200MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: "File size must be less than 200MB"
      }, { status: 400 })
    }

    const videoExtensions = /\.(mp4|mov|avi|wmv|mkv|webm|m4v|3gp|flv|f4v)$/i
    const videoMimeTypes = [
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
      'video/x-ms-wmv', 'video/x-matroska', 'video/webm', 'video/3gpp'
    ]
    
    const isVideoFile = videoMimeTypes.includes(file.type) || 
                       videoExtensions.test(file.name) ||
                       file.type.startsWith('video/')
    
    if (!isVideoFile) {
      return NextResponse.json({
        error: "Only video files are allowed"
      }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    console.log('Starting Cloudinary upload...')
    
    // Enhanced Cloudinary upload with audio extraction for transcripts
    const result = await new Promise<any>((resolve, reject) => {
      const uploadOptions = {
        resource_type: "video" as const,
        folder: "training-videos",
        public_id: `video_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        timeout: 280000, // ~5 minutes
        
        // Optimized settings
        quality: "auto:good",
        format: "mp4",
        video_codec: "h264",
        audio_codec: "aac",
        
        // Generate audio version if transcript is requested
        eager: generateTranscript ? [
          {
            width: 1920,
            height: 1080,
            crop: "limit",
            quality: "auto:good",
            format: "mp4"
          },
          {
            resource_type: "video",
            format: "mp3",
            audio_codec: "mp3"
          }
        ] : [
          {
            width: 1920,
            height: 1080,
            crop: "limit",
            quality: "auto:good",
            format: "mp4"
          }
        ],
        
        eager_async: false,
        overwrite: true,
        use_filename: false,
        unique_filename: true,
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error)
            reject(error)
          } else {
            console.log("Upload successful!")
            resolve(result)
          }
        }
      )

      uploadStream.on('error', (error) => {
        console.error("Stream error:", error)
        reject(error)
      })

      const timeoutId = setTimeout(() => {
        reject(new Error('Upload timeout'))
      }, 270000)

      uploadStream.on('finish', () => {
        clearTimeout(timeoutId)
      })

      uploadStream.end(buffer)
    })

    // Get audio URL for transcript generation
    const audioUrl = generateTranscript && result.eager?.length > 1 ? 
      result.eager[1]?.secure_url : null

    // Prepare response
    const response = {
      url: result.secure_url,
      duration: result.duration ? Math.round(result.duration) : null,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      
      // Audio URL for transcript (if generated)
      audioUrl,
      
      // Transcript info
      transcriptSupported: !!(process.env.ASSEMBLYAI_API_KEY || process.env.OPENAI_API_KEY),
      transcriptRequested: generateTranscript
    }

    console.log('Upload completed successfully:', {
      url: response.url,
      duration: response.duration,
      transcriptRequested: generateTranscript,
      transcriptSupported: response.transcriptSupported,
      audioUrl: audioUrl
    })

    // If transcript was requested and we have the necessary setup, queue transcript generation
    if (generateTranscript && response.transcriptSupported && videoId) {
      try {
        console.log('Queueing transcript generation for video:', videoId)
        const generator = TranscriptGenerator.getInstance()
        
        // Use audio URL if available, otherwise use video URL
        const sourceUrl = audioUrl || result.secure_url
        await generator.queueVideo(videoId, sourceUrl, 'high')
        
        console.log('Transcript generation queued successfully')
      } catch (transcriptError) {
        console.error('Error queueing transcript generation:', transcriptError)
        // Don't fail the upload if transcript queueing fails
      }
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error("Upload error:", error)
    
    if (error.http_code === 400) {
      return NextResponse.json({
        error: "Invalid file format or corrupted video"
      }, { status: 400 })
    }
    
    if (error.http_code === 413) {
      return NextResponse.json({
        error: "File too large. Maximum size is 200MB"
      }, { status: 413 })
    }
    
    if (error.message?.includes('timeout')) {
      return NextResponse.json({
        error: "Upload timeout. Please try with a smaller file"
      }, { status: 408 })
    }

    return NextResponse.json({
      error: error.message || "Upload failed"
    }, { status: 500 })
  }
}