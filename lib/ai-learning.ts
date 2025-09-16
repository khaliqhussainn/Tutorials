// lib/ai-learning.ts - Core AI learning utilities
import { prisma } from "./prisma"

export interface LearningSession {
  userId: string
  videoId: string
  startTime: Date
  endTime?: Date
  interactions: AIInteraction[]
  comprehensionScore?: number
  engagementLevel: 'low' | 'medium' | 'high'
}

export interface AIInteraction {
  type: 'question' | 'explanation' | 'summary' | 'note' | 'quiz'
  query: string
  response: string
  satisfaction?: number
  timestamp: Date
}

export class AILearningAnalytics {
  static async trackInteraction(
    userId: string,
    videoId: string,
    interaction: Omit<AIInteraction, 'timestamp'>
  ): Promise<void> {
    try {
      await prisma.aIInteraction.create({
        data: {
          userId,
          videoId,
          type: interaction.type,
          query: interaction.query,
          response: interaction.response,
          satisfaction: interaction.satisfaction,
          timestamp: new Date()
        }
      })
    } catch (error) {
      console.error('Failed to track AI interaction:', error)
    }
  }

  static async calculateComprehensionScore(
    userId: string,
    videoId: string
  ): Promise<number> {
    try {
      const interactions = await prisma.aIInteraction.findMany({
        where: { userId, videoId },
        orderBy: { timestamp: 'desc' }
      })

      if (interactions.length === 0) return 0

      // Calculate based on interaction patterns
      const questionCount = interactions.filter(i => i.type === 'question').length
      const avgSatisfaction = interactions
        .filter(i => i.satisfaction !== null)
        .reduce((sum, i) => sum + (i.satisfaction || 0), 0) / interactions.length || 0

      // Higher engagement and satisfaction = higher comprehension
      const engagementScore = Math.min(questionCount * 10, 40) // Max 40 points for questions
      const satisfactionScore = avgSatisfaction * 60 // Max 60 points for satisfaction

      return Math.min(Math.round(engagementScore + satisfactionScore), 100)
    } catch (error) {
      console.error('Failed to calculate comprehension score:', error)
      return 0
    }
  }

  static async generatePersonalizedSuggestions(
    userId: string,
    videoId: string
  ): Promise<string[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          enrollments: {
            include: {
              course: { select: { category: true, level: true } }
            }
          },
          videoProgress: {
            where: { videoId },
            select: { completed: true, testPassed: true, testScore: true }
          }
        }
      })

      if (!user) return []

      const suggestions = []
      const progress = user.videoProgress[0]

      if (!progress?.completed) {
        suggestions.push("Complete watching the video to unlock AI study tools")
      }

      if (progress?.completed && !progress?.testPassed) {
        suggestions.push("Take the quiz to test your understanding")
        suggestions.push("Ask the AI tutor to explain difficult concepts")
      }

      if (progress?.testScore && progress.testScore < 80) {
        suggestions.push("Review AI-generated notes for key concepts")
        suggestions.push("Request a concept map to visualize relationships")
      }

      // Category-based suggestions
      const userCategories = user.enrollments.map(e => e.course.category)
      const uniqueCategories = Array.from(new Set(userCategories))

      if (uniqueCategories.includes('Programming')) {
        suggestions.push("Practice coding concepts with AI-generated exercises")
      }

      if (uniqueCategories.includes('Design')) {
        suggestions.push("Explore design principles through interactive examples")
      }

      return suggestions.slice(0, 5) // Return top 5 suggestions
    } catch (error) {
      console.error('Failed to generate suggestions:', error)
      return []
    }
  }
}