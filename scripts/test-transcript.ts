// scripts/test-transcript.ts - Test script for single video
import { TranscriptGenerator } from '../lib/transcript-generator'

async function testTranscript() {
  const videoUrl = process.argv[2]
  const videoId = 'test-video-id'

  if (!videoUrl) {
    console.log('Usage: npx ts-node scripts/test-transcript.ts <video-url>')
    process.exit(1)
  }

  console.log('🧪 Testing transcript generation...')
  console.log(`📹 Video URL: ${videoUrl}`)

  try {
    const generator = new TranscriptGenerator('openai')
    const result = await generator.generateTranscript(videoUrl, videoId)

    console.log('\n✅ SUCCESS!')
    console.log(`📝 Transcript length: ${result.transcript.length} characters`)
    console.log(`🎯 Confidence: ${Math.round((result.confidence || 0) * 100)}%`)
    console.log(`🌍 Language: ${result.language}`)
    console.log(`📊 Segments: ${result.segments.length}`)

    console.log('\n📜 First 200 characters:')
    console.log(result.transcript.substring(0, 200) + '...')

  } catch (error: any) {
    console.error('\n❌ FAILED!')
    console.error('Error:', error.message)
    console.error('\nTroubleshooting:')
    console.error('1. Check if the video URL is accessible')
    console.error('2. Verify your API keys are set correctly')
    console.error('3. Ensure the video format is supported')
    console.error('4. Check your API quota/usage limits')
  }
}

if (require.main === module) {
  testTranscript()
}