// lib/env-check.ts - Check required environment variables
export function checkTranscriptEnvironment(): {
  hasOpenAI: boolean
  hasCloudinary: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check OpenAI API Key
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  if (!hasOpenAI) {
    errors.push('OPENAI_API_KEY is required for transcript generation')
  }

  // Check Cloudinary setup
  const hasCloudinary = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
  
  if (!hasCloudinary) {
    errors.push('Cloudinary environment variables are required for video uploads')
  }

  // Check database
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required')
  }

  // Warnings for optional features
  if (!process.env.GOOGLE_CLOUD_API_KEY) {
    warnings.push('GOOGLE_CLOUD_API_KEY not set - Google Speech-to-Text unavailable')
  }

  if (!process.env.ASSEMBLYAI_API_KEY) {
    warnings.push('ASSEMBLYAI_API_KEY not set - AssemblyAI transcription unavailable')
  }

  return {
    hasOpenAI,
    hasCloudinary,
    errors,
    warnings
  }
}
