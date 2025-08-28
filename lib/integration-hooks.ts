// lib/integration-hooks.ts - Updated integration hooks for video upload
import { QuizHooks } from '../hooks/quiz-hooks'
import { TranscriptQuizGenerator } from './quiz-generator'

export class VideoIntegrationHooks {
  // Call this when a video is uploaded
  static async onVideoUploaded(videoId: string, options: {
    generateTranscript?: boolean
    generateQuiz?: boolean
    hasAIPrompt?: boolean
  } = {}) {
    console.log(`🎬 Video uploaded: ${videoId}`, options)

    try {
      // Start transcript generation if requested
      if (options.generateTranscript) {
        // Your existing transcript generation logic
        console.log('📝 Starting transcript generation...')
      }

      // Generate quiz immediately if requested and no transcript generation
      if (options.generateQuiz && !options.generateTranscript) {
        console.log('🧠 Starting quiz generation from video topic...')
        setTimeout(async () => {
          try {
            const generator = new TranscriptQuizGenerator()
            await generator.generateQuizFromVideo(videoId)
          } catch (error) {
            console.error('Failed to generate quiz after video upload:', error)
          }
        }, 5000) // Small delay to ensure video is fully processed
      }

      // If both transcript and quiz are requested, quiz will be generated after transcript completes
      if (options.generateQuiz && options.generateTranscript) {
        console.log('📝 Quiz will be generated after transcript completion')
      }

    } catch (error) {
      console.error('Failed to process video upload hooks:', error)
    }
  }

  // Call this when transcript generation completes
  static async onTranscriptCompleted(videoId: string) {
    console.log(`📝 Transcript completed for video: ${videoId}`)

    try {
      // Generate quiz from transcript
      const generator = new TranscriptQuizGenerator()
      await generator.generateQuizFromVideo(videoId)
      console.log('✅ Quiz generated from transcript')
    } catch (error) {
      console.error('Failed to generate quiz after transcript completion:', error)
    }
  }
}
