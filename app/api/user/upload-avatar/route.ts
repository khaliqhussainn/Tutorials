// app/api/user/upload-avatar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import cloudinary from '@/lib/cloudinary'

export const maxDuration = 60 // 1 minute should be enough for avatar uploads
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  console.log('=== AVATAR UPLOAD STARTED ===')
  
  try {
    const session = await getServerSession(authOptions)
    console.log('Session check:', !!session, session?.user?.email)
    
    if (!session?.user?.email) {
      console.log('Authorization failed - no session')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('Getting form data...')
    const data = await request.formData()
    const file: File | null = data.get('avatar') as unknown as File
    
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

    // Avatar file size limit (5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      console.log('File too large:', file.size, 'bytes')
      return NextResponse.json({
        error: "Avatar file size must be less than 5MB"
      }, { status: 400 })
    }

    // Check if file is an image
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i
    const imageMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
      'image/webp', 'image/bmp', 'image/svg+xml'
    ]
    
    const isImageFile = imageMimeTypes.includes(file.type) || 
                       imageExtensions.test(file.name) ||
                       file.type.startsWith('image/')
    
    if (!isImageFile) {
      console.log('Invalid file type:', file.type, 'File name:', file.name)
      return NextResponse.json({
        error: "Only image files are allowed. Supported formats: JPG, PNG, GIF, WEBP"
      }, { status: 400 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, image: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('Converting file to buffer...')
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    console.log('Buffer created, size:', buffer.length, 'bytes')

    console.log('Starting Cloudinary upload...')
    
    // If user has an existing avatar, get the public_id to replace it
    let publicId = `avatars/user_${user.id}_${Date.now()}`
    
    // If user has existing Cloudinary image, extract public_id for replacement
    if (user.image && user.image.includes('cloudinary.com')) {
      try {
        const urlParts = user.image.split('/')
        const fileWithExt = urlParts[urlParts.length - 1]
        const existingPublicId = fileWithExt.split('.')[0]
        if (existingPublicId.startsWith('user_')) {
          publicId = `avatars/${existingPublicId}`
        }
      } catch (e) {
        console.log('Could not extract existing public_id, creating new one')
      }
    }

    // Upload to Cloudinary with avatar-specific optimizations
    const result = await new Promise<any>((resolve, reject) => {
      const uploadOptions = {
        resource_type: "image" as const,
        folder: "avatars",
        public_id: publicId,
        timeout: 30000, // 30 seconds timeout
        
        // Avatar-specific transformations
        transformation: [
          {
            width: 400,
            height: 400,
            crop: "fill",
            gravity: "face", // Focus on face if detected
            quality: "auto:good",
            format: "jpg", // Convert to JPG for consistency and smaller size
            fetch_format: "auto" // Auto-deliver WebP when supported
          }
        ],
        
        // Optimization settings
        overwrite: true,
        invalidate: true, // Ensure CDN cache is updated
        use_filename: false,
        unique_filename: false, // We're providing our own public_id
        
        // Generate additional sizes for different use cases
        eager: [
          {
            width: 150,
            height: 150,
            crop: "fill",
            gravity: "face",
            quality: "auto:good",
            format: "jpg"
          },
          {
            width: 50,
            height: 50,
            crop: "fill",
            gravity: "face",
            quality: "auto:good",
            format: "jpg"
          }
        ],
        eager_async: false
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
            console.log("Avatar upload successful!")
            console.log("Result:", {
              public_id: result?.public_id,
              secure_url: result?.secure_url,
              format: result?.format,
              bytes: result?.bytes,
              width: result?.width,
              height: result?.height
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
        reject(new Error('Upload timeout - please try again'))
      }, 25000) // 25 seconds

      uploadStream.on('finish', () => {
        clearTimeout(timeoutId)
      })

      console.log('Writing buffer to stream...')
      uploadStream.end(buffer)
    })

    // Update user profile with new avatar URL
    console.log('Updating user profile with new avatar URL...')
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { image: result.secure_url },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    })

    // Prepare response with avatar URLs
    const response = {
      success: true,
      message: 'Avatar uploaded successfully',
      user: updatedUser,
      avatar: {
        url: result.secure_url,
        publicId: result.public_id,
        // Generate URLs for different sizes
        sizes: {
          large: cloudinary.url(result.public_id, {
            width: 400,
            height: 400,
            crop: "fill",
            gravity: "face",
            quality: "auto:good",
            format: "jpg"
          }),
          medium: cloudinary.url(result.public_id, {
            width: 150,
            height: 150,
            crop: "fill",
            gravity: "face",
            quality: "auto:good",
            format: "jpg"
          }),
          small: cloudinary.url(result.public_id, {
            width: 50,
            height: 50,
            crop: "fill",
            gravity: "face",
            quality: "auto:good",
            format: "jpg"
          })
        }
      }
    }

    console.log('Avatar upload completed successfully:', {
      userId: user.id,
      avatarUrl: result.secure_url,
      publicId: result.public_id
    })

    return NextResponse.json(response)

  } catch (error: any) {
    console.error("=== AVATAR UPLOAD ERROR ===")
    console.error("Error type:", error.constructor?.name)
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)
    console.error("Cloudinary error details:", {
      http_code: error.http_code,
      error: error.error,
      name: error.name
    })
    
    // Enhanced error handling for avatar uploads
    if (error.http_code === 400) {
      return NextResponse.json({
        error: "Invalid image format or corrupted file"
      }, { status: 400 })
    }
    
    if (error.http_code === 413 || error.name === 'PayloadTooLargeError') {
      return NextResponse.json({
        error: "Image file too large. Maximum size is 5MB"
      }, { status: 413 })
    }
    
    if (error.message?.includes('timeout') || error.http_code === 499) {
      return NextResponse.json({
        error: "Upload timeout. Please try again with a smaller image"
      }, { status: 408 })
    }
    
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      return NextResponse.json({
        error: "Network error. Please check your internet connection and try again"
      }, { status: 502 })
    }

    return NextResponse.json({
      error: error.message || "Avatar upload failed. Please try again"
    }, { status: 500 })
  } finally {
    console.log('=== AVATAR UPLOAD ENDED ===')
  }
}

// DELETE endpoint to remove avatar
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, image: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If user has a Cloudinary avatar, delete it
    if (user.image && user.image.includes('cloudinary.com')) {
      try {
        const urlParts = user.image.split('/')
        const fileWithExt = urlParts[urlParts.length - 1]
        const publicId = `avatars/${fileWithExt.split('.')[0]}`
        
        await cloudinary.uploader.destroy(publicId)
        console.log('Deleted avatar from Cloudinary:', publicId)
      } catch (e) {
        console.log('Could not delete from Cloudinary:', e)
        // Continue anyway to remove from database
      }
    }

    // Remove avatar from user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { image: null },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Avatar removed successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('Error removing avatar:', error)
    return NextResponse.json({ error: 'Failed to remove avatar' }, { status: 500 })
  }
}