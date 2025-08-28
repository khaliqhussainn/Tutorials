
// lib/hooks/quiz-hooks.ts - Integration hooks
import { TranscriptQuizGenerator } from '../lib/quiz-generator'
import { prisma } from '../lib/prisma'

export class QuizHooks {
  // Hook for when video is uploaded
  static async onVideoUploaded(videoId: string, hasTranscript = false): Promise<void> {
    console.log(`🎬 Video uploaded: ${videoId}, generating quiz...`)
    
    try {
      await TranscriptQuizGenerator.onVideoUpload(videoId, hasTranscript)
    } catch (error) {
      console.error('Failed to generate quiz on video upload:', error)
    }
  }

  // Hook for when transcript is completed
  static async onTranscriptCompleted(videoId: string): Promise<void> {
    console.log(`📝 Transcript completed for video: ${videoId}`)
    
    try {
      await TranscriptQuizGenerator.onTranscriptCompleted(videoId)
    } catch (error) {
      console.error('Failed to regenerate quiz after transcript:', error)
    }
  }

  // Hook for when quiz is completed successfully
  static async onQuizPassed(userId: string, videoId: string, score: number): Promise<void> {
    console.log(`✅ User ${userId} passed quiz for video ${videoId} with score ${score}%`)
    
    try {
      // Create notification
      await prisma.notification.create({
        data: {
          userId,
          title: 'Quiz Completed! 🎉',
          message: `Great job! You scored ${score}% on the quiz.`,
          type: 'SUCCESS',
          metadata: {
            videoId,
            score,
            event: 'quiz_passed'
          }
        }
      })

      // Log activity
      await prisma.userActivity.create({
        data: {
          userId,
          type: 'QUIZ_PASSED',
          title: 'Quiz Passed',
          description: `Scored ${score}% on video quiz`,
          metadata: {
            videoId,
            score
          }
        }
      })
    } catch (error) {
      console.error('Failed to process quiz completion hooks:', error)
    }
  }

  // Check if user needs to take quiz before proceeding
  static async checkQuizRequirement(userId: string, videoId: string): Promise<{
    needsQuiz: boolean
    hasQuiz: boolean
    passed: boolean
    canProceed: boolean
  }> {
    try {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          tests: {
            select: { id: true }
          }
        }
      })

      if (!video || video.tests.length === 0) {
        return {
          needsQuiz: false,
          hasQuiz: false,
          passed: true,
          canProceed: true
        }
      }

      const progress = await prisma.videoProgress.findUnique({
        where: {
          userId_videoId: {
            userId,
            videoId
          }
        }
      })

      const hasQuiz = video.tests.length > 0
      const passed = progress?.testPassed || false
      const completed = progress?.completed || false

      return {
        needsQuiz: hasQuiz && completed && !passed,
        hasQuiz,
        passed,
        canProceed: !hasQuiz || passed
      }

    } catch (error) {
      console.error('Error checking quiz requirement:', error)
      return {
        needsQuiz: false,
        hasQuiz: false,
        passed: false,
        canProceed: true
      }
    }
  }
}