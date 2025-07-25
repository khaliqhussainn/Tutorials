// app/api/upload/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import cloudinary from "@/lib/cloudinary"

// Increase timeout for video uploads (5 minutes)
export const maxDuration = 300

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File
    
    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      )
    }

    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 100MB" },
        { status: 400 }
      )
    }

    // Check file type
    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: "Only video files are allowed" },
        { status: 400 }
      )
    }

    console.log(`Starting upload for file: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Cloudinary with extended timeout and chunked upload
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          folder: "training-videos",
          chunk_size: 6000000, // 6MB chunks
          timeout: 240000, // 4 minutes timeout
          eager: [
            { 
              width: 1280, 
              height: 720, 
              crop: "limit",
              quality: "auto",
              format: "mp4"
            }
          ],
          eager_async: true, // Process transformations asynchronously
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error)
            reject(error)
          } else {
            console.log("Upload successful:", result?.public_id)
            resolve(result)
          }
        }
      )

      uploadStream.end(buffer)
    }) as any

    return NextResponse.json({
      url: result.secure_url,
      duration: result.duration || 0,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes
    })

  } catch (error: any) {
    console.error("Upload error:", error)
    
    // Handle specific Cloudinary errors
    if (error.message?.includes('timeout') || error.http_code === 499) {
      return NextResponse.json(
        { error: "Upload timeout. Please try with a smaller file or check your internet connection." },
        { status: 408 }
      )
    }
    
    if (error.http_code === 413) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 100MB." },
        { status: 413 }
      )
    }

    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    )
  }
}
