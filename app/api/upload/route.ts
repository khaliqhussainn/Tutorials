// app/api/upload/route.ts - ENHANCED with automatic transcript generation
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import cloudinary from "@/lib/cloudinary"
import { TranscriptQueue } from "@/lib/transcript-queue"

export const maxDuration = 300 // 5 minutes
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  console.log('=== VIDEO UPLOAD WITH AUTO-TRANSCRIPT STARTED ===')
  
  try {
    const session = await getServerSession(authOptions)
    console.log('Session check:', !!session, session?.user?.role)
    
    if (!session || session.user.role !== 'ADMIN') {
      console.log('Authorization failed')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('Getting form data...')
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File
    const generateTranscript = data.get('generateTranscript') === 'true'
    
    if (!file) {
      console.log('No file found in form data')
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    console.log('File details:', {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      type: file.type,
      generateTranscript
    })

    // File size limit for faster uploads
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      console.log('File too large:', file.size, 'bytes')
      return NextResponse.json({
        error: "File size must be less than 100MB for reliable uploads"
      }, { status: 400 })
    }

    // Video type checking
    const videoExtensions = /\.(mp4|mov|avi|wmv|mkv|webm|m4v|3gp|flv|f4v)$/i
    const videoMimeTypes = [
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
      'video/x-ms-wmv', 'video/x-matroska', 'video/webm', 'video/3gpp'
    ]
    
    const isVideoFile = videoMimeTypes.includes(file.type) || 
                       videoExtensions.test(file.name) ||
                       file.type.startsWith('video/')
    
    if (!isVideoFile) {
      console.log('Invalid file type:', file.type, 'File name:', file.name)
      return NextResponse.json({
        error: "Only video files are allowed. Supported formats: MP4, MOV, AVI, WMV, MKV, WEBM"
      }, { status: 400 })
    }

    console.log('Converting file to buffer...')
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    console.log('Buffer created, size:', buffer.length, 'bytes')

    console.log('Starting Cloudinary upload with transcript optimization...')
    
    // Enhanced Cloudinary upload optimized for transcript generation
    const result = await new Promise<any>((resolve, reject) => {
      const uploadOptions = {
        resource_type: "video" as const,
        folder: "training-videos",
        public_id: `video_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        chunk_size: 8000000, // 8MB chunks
        timeout: 280000, // 4 minutes 40 seconds
        
        // Optimized video settings for transcript generation
        quality: "auto:good",
        format: "mp4", // Force MP4 for better compatibility
        video_codec: "h264",
        audio_codec: "aac", // Important for transcript generation
        
        // Generate audio-only version for transcript processing
        eager: [
          {
            width: 1920,
            height: 1080,
            crop: "limit",
            quality: "auto:good",
            format: "mp4"
          },
          ...(generateTranscript ? [{
            resource_type: "video",
            format: "mp3", // Audio-only for transcript
            audio_codec: "mp3",
            video_codec: "none"
          }] : [])
        ],
        
        eager_async: false,
        overwrite: true,
        use_filename: false,
        unique_filename: true,
      }

      console.log('Upload options:', JSON.stringify(uploadOptions, null, 2))

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error)
            reject(error)
          } else {
            console.log("Upload successful!")
            console.log("Result:", {
              public_id: result?.public_id,
              secure_url: result?.secure_url,
              duration: result?.duration,
              format: result?.format,
              bytes: result?.bytes,
              width: result?.width,
              height: result?.height,
              eager: result?.eager?.length || 0
            })
            resolve(result)
          }
        }
      )

      uploadStream.on('error', (error) => {
        console.error("Stream error:", error)
        reject(error)
      })

      // Timeout handling
      const timeoutId = setTimeout(() => {
        reject(new Error('Upload timeout - please try with a smaller file'))
      }, 270000) // 4.5 minutes

      uploadStream.on('finish', () => {
        clearTimeout(timeoutId)
      })

      console.log('Writing buffer to stream...')
      uploadStream.end(buffer)
    })

    // Prepare enhanced response
    const response = {
      url: result.secure_url,
      duration: result.duration ? Math.round(result.duration) : null,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      aspectRatio: result.width && result.height ? (result.width / result.height).toFixed(2) : null,
      bitRate: result.bit_rate || null,
      frameRate: result.frame_rate || null,
      
      // Audio URL for transcript generation (if available)
      audioUrl: generateTranscript && result.eager?.length > 1 ? 
        result.eager[1]?.secure_url : null,
      
      // Transcript processing info
      transcriptReady: false,
      transcriptQueued: generateTranscript
    }

    console.log('Upload completed successfully:', response)
    
    // Log duration specifically
    if (response.duration) {
      console.log(`Video duration detected: ${response.duration} seconds (${Math.floor(response.duration / 60)}:${(response.duration % 60).toString().padStart(2, '0')})`)
    } else {
      console.warn('Warning: Video duration not detected from Cloudinary response')
    }

    // Add to transcript queue if requested
    if (generateTranscript && process.env.OPENAI_API_KEY) {
      try {
        const queue = TranscriptQueue.getInstance()
        // We'll queue it with a temporary ID, it will be updated when video is created
        console.log('🎬 Transcript generation will be queued after video creation')
      } catch (error) {
        console.warn('Failed to queue transcript generation:', error)
        // Don't fail the upload for transcript issues
      }
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error("=== UPLOAD ERROR ===")
    console.error("Error type:", error.constructor?.name)
    console.error("Error message:", error.message)
    
    // Enhanced error handling
    if (error.http_code === 400) {
      return NextResponse.json({
        error: "Invalid file format or corrupted video file"
      }, { status: 400 })
    }
    
    if (error.http_code === 413 || error.name === 'PayloadTooLargeError') {
      return NextResponse.json({
        error: "File too large. Maximum size is 100MB"
      }, { status: 413 })
    }
    
    if (error.message?.includes('timeout') || error.http_code === 499) {
      return NextResponse.json({
        error: "Upload timeout. Please try with a smaller file (under 50MB recommended)"
      }, { status: 408 })
    }

    return NextResponse.json({
      error: error.message || "Upload failed. Please try again with a smaller file"
    }, { status: 500 })
  } finally {
    console.log('=== VIDEO UPLOAD ENDED ===')
  }
}