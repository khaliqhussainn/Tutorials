// app/api/upload/route.ts - FIXED with correct maxDuration for Hobby plan
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import cloudinary from "@/lib/cloudinary"

export const maxDuration = 300 // 5 minutes (max for Hobby plan)
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  console.log('=== VIDEO UPLOAD STARTED ===')
  
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
    
    if (!file) {
      console.log('No file found in form data')
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    console.log('File details:', {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    })

    // Reduced file size limit for faster uploads within 5-minute timeout
    const maxSize = 100 * 1024 * 1024 // 100MB (reduced from 200MB)
    if (file.size > maxSize) {
      console.log('File too large:', file.size, 'bytes')
      return NextResponse.json({
        error: "File size must be less than 100MB for reliable uploads"
      }, { status: 400 })
    }

    // Comprehensive video type checking
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

    console.log('Starting Cloudinary upload...')
    
    // Optimized Cloudinary upload for faster processing
    const result = await new Promise<any>((resolve, reject) => {
      const uploadOptions = {
        resource_type: "video" as const,
        folder: "training-videos",
        public_id: `video_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        chunk_size: 8000000, // 8MB chunks (increased for faster upload)
        timeout: 280000, // 4 minutes 40 seconds (leave buffer for processing)
        
        // Optimized video settings for faster processing
        quality: "auto:good",
        format: "mp4", // Force MP4 output
        video_codec: "h264",
        audio_codec: "aac",
        
        // Fast upload settings
        overwrite: true,
        invalidate: false, // Disable to speed up
        use_filename: false,
        unique_filename: true,
        
        // Disable eager transformations to speed up initial upload
        eager_async: false,
        eager: [], // No transformations during upload
        
        // Optimize for speed
        flags: "progressive"
      }

      console.log('Upload options:', JSON.stringify(uploadOptions, null, 2))

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error)
            console.error("Error details:", {
              message: error.message,
              http_code: error.http_code,
              name: error.name
            })
            reject(error)
          } else {
            console.log("Upload successful!")
            console.log("Result:", {
              public_id: result?.public_id,
              secure_url: result?.secure_url,
              duration: result?.duration,
              format: result?.format,
              bytes: result?.bytes
            })
            resolve(result)
          }
        }
      )

      uploadStream.on('error', (error) => {
        console.error("Stream error:", error)
        reject(error)
      })

      // Add timeout handling
      const timeoutId = setTimeout(() => {
        reject(new Error('Upload timeout - please try with a smaller file'))
      }, 270000) // 4.5 minutes

      uploadStream.on('finish', () => {
        clearTimeout(timeoutId)
      })

      console.log('Writing buffer to stream...')
      uploadStream.end(buffer)
    })

    const response = {
      url: result.secure_url,
      duration: Math.round(result.duration || 0),
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height
    }

    console.log('Upload completed successfully:', response)
    return NextResponse.json(response)

  } catch (error: any) {
    console.error("=== UPLOAD ERROR ===")
    console.error("Error type:", error.constructor?.name)
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)
    console.error("Cloudinary error details:", {
      http_code: error.http_code,
      error: error.error,
      name: error.name
    })
    
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
    
    if (error.message?.includes('timeout') || error.http_code === 499 || error.message?.includes('Upload timeout')) {
      return NextResponse.json({
        error: "Upload timeout. Please try with a smaller file (under 50MB recommended) or compress your video"
      }, { status: 408 })
    }
    
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      return NextResponse.json({
        error: "Network error. Please check your internet connection and try again"
      }, { status: 502 })
    }

    return NextResponse.json({
      error: error.message || "Upload failed. Please try again with a smaller file"
    }, { status: 500 })
  } finally {
    console.log('=== VIDEO UPLOAD ENDED ===')
  }
}