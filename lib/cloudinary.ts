// lib/cloudinary.ts - Enhanced configuration
import { v2 as cloudinary } from 'cloudinary'

if (!process.env.CLOUDINARY_CLOUD_NAME || 
    !process.env.CLOUDINARY_API_KEY || 
    !process.env.CLOUDINARY_API_SECRET) {
  console.error('Missing Cloudinary environment variables:')
  console.error('CLOUDINARY_CLOUD_NAME:', !!process.env.CLOUDINARY_CLOUD_NAME)
  console.error('CLOUDINARY_API_KEY:', !!process.env.CLOUDINARY_API_KEY)
  console.error('CLOUDINARY_API_SECRET:', !!process.env.CLOUDINARY_API_SECRET)
  throw new Error('Missing required Cloudinary environment variables')
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  // Enhanced configuration for video uploads
  upload_timeout: 600000, // 10 minutes
  chunk_size: 6000000, // 6MB chunks
})

console.log('Cloudinary configured with cloud name:', process.env.CLOUDINARY_CLOUD_NAME)

export default cloudinary
