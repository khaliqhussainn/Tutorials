// lib/hooks/quiz-hooks.ts - FIXED integration hooks
import { TranscriptQuizGenerator } from '../lib/quiz-generator'
import { prisma } from '../lib/prisma'

export class QuizHooks {
  static async onVideoUploaded(videoId: string, hasTranscript = false): Promise<void> {
    console.log(`Video uploaded: ${videoId}, transcript: ${hasTranscript}`)
    
    try {
      await TranscriptQuizGenerator.onVideoUpload(videoId, hasTranscript)
    } catch (error) {
      console.error('Quiz generation on upload failed:', error)
    }
  }

  static async onTranscriptCompleted(videoId: string): Promise<void> {
    console.log(`Transcript completed for video: ${videoId}`)
    
    try {
      // Small delay to ensure transcript is saved
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      await TranscriptQuizGenerator.onTranscriptCompleted(videoId)
    } catch (error) {
      console.error('Quiz regeneration after transcript failed:', error)
    }
  }

  static async onQuizPassed(userId: string, videoId: string, score: number): Promise<void> {
    try {
      await Promise.all([
        prisma.notification.create({
          data: {
            userId,
            title: 'Quiz Completed!',
            message: `You scored ${score}% on the quiz.`,
            type: 'SUCCESS',
            metadata: { videoId, score, event: 'quiz_passed' }
          }
        }),
        prisma.userActivity.create({
          data: {
            userId,
            type: 'QUIZ_PASSED',
            title: 'Quiz Passed',
            description: `Scored ${score}% on video quiz`,
            metadata: { videoId, score }
          }
        })
      ])
    } catch (error) {
      console.error('Quiz completion hooks failed:', error)
    }
  }

  static async checkQuizRequirement(userId: string, videoId: string): Promise<{
    needsQuiz: boolean
    hasQuiz: boolean
    passed: boolean
    canProceed: boolean
    score?: number
  }> {
    try {
      const [video, progress] = await Promise.all([
        prisma.video.findUnique({
          where: { id: videoId },
          select: { tests: { select: { id: true } } }
        }),
        prisma.videoProgress.findUnique({
          where: { userId_videoId: { userId, videoId } }
        })
      ])

      if (!video || video.tests.length === 0) {
        return {
          needsQuiz: false,
          hasQuiz: false,
          passed: true,
          canProceed: true
        }
      }

      const hasQuiz = video.tests.length > 0
      const passed = progress?.testPassed || false
      const completed = progress?.completed || false
      const score = progress?.testScore || 0

      return {
        needsQuiz: hasQuiz && completed && !passed,
        hasQuiz,
        passed,
        canProceed: !hasQuiz || passed,
        score: passed ? score : undefined
      }
    } catch (error) {
      console.error('Quiz requirement check failed:', error)
      return {
        needsQuiz: false,
        hasQuiz: false,
        passed: false,
        canProceed: true
      }
    }
  }
}
