// lib/openai-utils.ts - Utility functions for OpenAI integration
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

export interface AIResponse {
  content: string
  confidence: number
  timestamp: string
  model: string
}

export interface LearningInsight {
  type: 'strength' | 'improvement' | 'recommendation'
  title: string
  description: string
  actionable: boolean
}

export class OpenAILearningUtils {
  static async generateResponse(
    prompt: string,
    systemMessage: string = "You are a helpful AI learning assistant.",
    options: {
      temperature?: number
      maxTokens?: number
      model?: string
    } = {}
  ): Promise<AIResponse> {
    try {
      const {
        temperature = 0.7,
        maxTokens = 1500,
        model = "gpt-4"
      } = options

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        temperature,
        max_tokens: maxTokens,
      })

      const content = completion.choices[0]?.message?.content || ""

      return {
        content,
        confidence: content.length > 50 ? 0.9 : 0.6, // Simple confidence scoring
        timestamp: new Date().toISOString(),
        model
      }
    } catch (error) {
      console.error('OpenAI API error:', error)
      throw new Error('Failed to generate AI response')
    }
  }

  static async generatePersonalizedFeedback(
    userProgress: {
      completedVideos: number
      totalVideos: number
      averageQuizScore: number
      timeSpent: number
      strongSubjects: string[]
      weakSubjects: string[]
    },
    recentActivity: string[]
  ): Promise<LearningInsight[]> {
    const prompt = `Analyze this learning data and provide personalized feedback:

Progress: ${userProgress.completedVideos}/${userProgress.totalVideos} videos completed
Average Quiz Score: ${userProgress.averageQuizScore}%
Time Spent Learning: ${Math.round(userProgress.timeSpent / 60)} hours
Strong Subjects: ${userProgress.strongSubjects.join(', ')}
Areas for Improvement: ${userProgress.weakSubjects.join(', ')}
Recent Activity: ${recentActivity.join(', ')}

Generate 3-5 specific, actionable insights in JSON format:
{
  "insights": [
    {
      "type": "strength|improvement|recommendation",
      "title": "Brief insight title",
      "description": "Detailed explanation with specific suggestions",
      "actionable": true
    }
  ]
}`

    try {
      const response = await this.generateResponse(
        prompt,
        "You are an expert learning analyst who provides personalized educational feedback.",
        { temperature: 0.6 }
      )

      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return parsed.insights || []
      }

      return []
    } catch (error) {
      console.error('Failed to generate personalized feedback:', error)
      return this.generateFallbackInsights(userProgress)
    }
  }

  static generateFallbackInsights(userProgress: any): LearningInsight[] {
    const insights: LearningInsight[] = []

    // Progress-based insights
    const completionRate = userProgress.completedVideos / userProgress.totalVideos
    if (completionRate > 0.8) {
      insights.push({
        type: 'strength',
        title: 'Excellent Progress!',
        description: 'You\'ve completed most of your courses. Consider exploring advanced topics or helping others learn.',
        actionable: true
      })
    } else if (completionRate < 0.3) {
      insights.push({
        type: 'recommendation',
        title: 'Set Learning Goals',
        description: 'Try setting small daily goals to build consistency. Even 15 minutes daily can make a big difference.',
        actionable: true
      })
    }

    // Quiz performance insights
    if (userProgress.averageQuizScore > 85) {
      insights.push({
        type: 'strength',
        title: 'Strong Test Performance',
        description: 'Your quiz scores show solid understanding. Consider teaching concepts to others to reinforce learning.',
        actionable: true
      })
    } else if (userProgress.averageQuizScore < 70) {
      insights.push({
        type: 'improvement',
        title: 'Focus on Comprehension',
        description: 'Review video content more thoroughly before taking quizzes. Take notes and practice explaining concepts.',
        actionable: true
      })
    }

    // Subject-specific insights
    if (userProgress.strongSubjects.length > 0) {
      insights.push({
        type: 'strength',
        title: `Strength in ${userProgress.strongSubjects[0]}`,
        description: `You're doing well in ${userProgress.strongSubjects[0]}. Consider pursuing advanced courses in this area.`,
        actionable: true
      })
    }

    return insights.slice(0, 4) // Return top 4 insights
  }

  static async generateStudyPlan(
    goals: string[],
    availableTime: number, // hours per week
    currentLevel: string,
    preferredSubjects: string[]
  ): Promise<any> {
    const prompt = `Create a personalized study plan:

Goals: ${goals.join(', ')}
Available Time: ${availableTime} hours per week
Current Level: ${currentLevel}
Preferred Subjects: ${preferredSubjects.join(', ')}

Generate a structured 4-week study plan in JSON format:
{
  "weeks": [
    {
      "week": 1,
      "focus": "Week focus area",
      "goals": ["Goal 1", "Goal 2"],
      "dailyTasks": [
        {
          "day": "Monday",
          "tasks": ["Task 1", "Task 2"],
          "estimatedTime": "2 hours"
        }
      ]
    }
  ],
  "tips": ["Study tip 1", "Study tip 2"],
  "milestones": ["Week 1: Complete X", "Week 2: Master Y"]
}`

    try {
      const response = await this.generateResponse(
        prompt,
        "You are an expert learning strategist who creates effective study plans.",
        { temperature: 0.6, maxTokens: 2000 }
      )

      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      return this.generateFallbackStudyPlan(availableTime, currentLevel)
    } catch (error) {
      console.error('Failed to generate study plan:', error)
      return this.generateFallbackStudyPlan(availableTime, currentLevel)
    }
  }

  static generateFallbackStudyPlan(availableTime: number, currentLevel: string): any {
    const dailyTime = Math.round(availableTime / 5) // Spread over 5 days
    
    return {
      weeks: [
        {
          week: 1,
          focus: "Foundation Building",
          goals: ["Establish routine", "Complete basic concepts"],
          dailyTasks: [
            {
              day: "Monday",
              tasks: ["Watch foundation videos", "Take notes"],
              estimatedTime: `${dailyTime} hours`
            },
            {
              day: "Tuesday",
              tasks: ["Practice exercises", "Review concepts"],
              estimatedTime: `${dailyTime} hours`
            }
          ]
        }
      ],
      tips: [
        "Study at the same time each day to build habit",
        "Take breaks every 25-30 minutes",
        "Review notes before starting new topics"
      ],
      milestones: [
        "Week 1: Complete foundation modules",
        "Week 2: Pass first assessment",
        "Week 3: Apply concepts in practice",
        "Week 4: Complete project or advanced assessment"
      ]
    }
  }

  static async generateConceptExplanation(
    concept: string,
    context: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ): Promise<{
    explanation: string
    examples: string[]
    applications: string[]
    nextSteps: string[]
  }> {
    const prompt = `Explain the concept of "${concept}" in the context of ${context}.

Target Level: ${difficulty}
Context: ${context}

Provide a comprehensive explanation that includes:
1. Clear definition and core principles
2. Real-world examples
3. Practical applications
4. Next learning steps

Format as JSON:
{
  "explanation": "Clear, detailed explanation appropriate for ${difficulty} level",
  "examples": ["Example 1", "Example 2", "Example 3"],
  "applications": ["Application 1", "Application 2"],
  "nextSteps": ["Next step 1", "Next step 2"]
}`

    try {
      const response = await this.generateResponse(
        prompt,
        `You are an expert educator who explains complex concepts clearly at the ${difficulty} level.`,
        { temperature: 0.6 }
      )

      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      return this.generateFallbackExplanation(concept, difficulty)
    } catch (error) {
      console.error('Failed to generate concept explanation:', error)
      return this.generateFallbackExplanation(concept, difficulty)
    }
  }

  static generateFallbackExplanation(concept: string, difficulty: string): any {
    return {
      explanation: `${concept} is an important concept that requires understanding of its fundamental principles and practical applications. At the ${difficulty} level, focus on grasping the core ideas and how they apply in real situations.`,
      examples: [
        `Basic example demonstrating ${concept}`,
        `Practical scenario showing ${concept} in action`,
        `Common use case for ${concept}`
      ],
      applications: [
        `${concept} is used in professional environments`,
        `${concept} helps solve real-world problems`
      ],
      nextSteps: [
        `Practice applying ${concept} in exercises`,
        `Study advanced aspects of ${concept}`,
        `Connect ${concept} to related topics`
      ]
    }
  }

  static async generateLearningObjectives(
    courseTitle: string,
    courseCategory: string,
    targetLevel: string
  ): Promise<string[]> {
    const prompt = `Generate 5-7 clear learning objectives for a course titled "${courseTitle}" in the ${courseCategory} category, targeted at ${targetLevel} level.

Learning objectives should be:
- Specific and measurable
- Action-oriented (using verbs like "understand," "apply," "create," "analyze")
- Achievable and relevant
- Focused on practical skills

Return as a simple JSON array of strings:
["Objective 1", "Objective 2", "Objective 3", "Objective 4", "Objective 5"]`

    try {
      const response = await this.generateResponse(
        prompt,
        "You are an expert curriculum designer who creates clear, actionable learning objectives.",
        { temperature: 0.6 }
      )

      const jsonMatch = response.content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      return this.generateFallbackObjectives(courseCategory, targetLevel)
    } catch (error) {
      console.error('Failed to generate learning objectives:', error)
      return this.generateFallbackObjectives(courseCategory, targetLevel)
    }
  }

  static generateFallbackObjectives(courseCategory: string, targetLevel: string): string[] {
    const category = courseCategory.toLowerCase()
    
    if (category.includes('web') || category.includes('frontend')) {
      return [
        "Understand HTML structure and semantic markup principles",
        "Apply CSS styling techniques for responsive design",
        "Implement JavaScript functionality for interactive user experiences",
        "Create accessible and cross-browser compatible web applications",
        "Demonstrate proficiency in modern web development workflows"
      ]
    } else if (category.includes('data') || category.includes('python')) {
      return [
        "Analyze data using Python programming language",
        "Create meaningful visualizations from complex datasets",
        "Apply statistical methods to interpret data patterns",
        "Implement machine learning algorithms for predictive modeling",
        "Communicate data insights effectively to stakeholders"
      ]
    } else if (category.includes('cyber') || category.includes('security')) {
      return [
        "Identify and assess cybersecurity threats and vulnerabilities",
        "Implement security controls and monitoring systems",
        "Develop incident response and recovery procedures",
        "Ensure compliance with security standards and regulations",
        "Create security awareness and training programs"
      ]
    } else {
      return [
        `Understand fundamental concepts in ${courseCategory}`,
        `Apply theoretical knowledge to practical scenarios`,
        `Analyze problems and develop effective solutions`,
        `Create projects demonstrating learned skills`,
        `Evaluate and improve upon existing approaches`
      ]
    }
  }

  static async assessLearningProgress(
    userAnswers: any[],
    correctAnswers: any[],
    timeSpent: number,
    difficulty: string
  ): Promise<{
    score: number
    strengths: string[]
    improvements: string[]
    recommendations: string[]
    nextTopics: string[]
  }> {
    const score = (userAnswers.filter((ans, i) => ans === correctAnswers[i]).length / correctAnswers.length) * 100

    const prompt = `Analyze this learning assessment:
Score: ${score}%
Time Spent: ${timeSpent} minutes
Difficulty: ${difficulty}
Correct Answers: ${userAnswers.filter((ans, i) => ans === correctAnswers[i]).length}/${correctAnswers.length}

Provide personalized feedback in JSON format:
{
  "score": ${score},
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Area 1", "Area 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "nextTopics": ["Topic 1", "Topic 2"]
}`

    try {
      const response = await this.generateResponse(
        prompt,
        "You are an expert learning assessor who provides constructive feedback.",
        { temperature: 0.6 }
      )

      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      return this.generateFallbackAssessment(score, timeSpent)
    } catch (error) {
      console.error('Failed to assess learning progress:', error)
      return this.generateFallbackAssessment(score, timeSpent)
    }
  }

  static generateFallbackAssessment(score: number, timeSpent: number): any {
    const assessment = {
      score,
      strengths: [],
      improvements: [],
      recommendations: [],
      nextTopics: []
    }

    if (score >= 90) {
      assessment.strengths = ["Excellent understanding of concepts", "Strong problem-solving skills"]
      assessment.recommendations = ["Explore advanced topics", "Consider mentoring others"]
      assessment.nextTopics = ["Advanced concepts", "Real-world projects"]
    } else if (score >= 70) {
      assessment.strengths = ["Good grasp of fundamentals", "Solid progress"]
      assessment.improvements = ["Review challenging areas", "Practice more examples"]
      assessment.recommendations = ["Continue current pace", "Focus on weak areas"]
      assessment.nextTopics = ["Intermediate concepts", "Practical applications"]
    } else {
      assessment.improvements = ["Fundamental concepts need review", "More practice required"]
      assessment.recommendations = ["Review lesson materials", "Take more time with concepts", "Seek additional help"]
      assessment.nextTopics = ["Foundation review", "Basic practice exercises"]
    }

    if (timeSpent < 10) {
      assessment.recommendations.push("Spend more time reviewing material")
    } else if (timeSpent > 60) {
      assessment.recommendations.push("Work on time management and efficiency")
    }

    return assessment
  }

  static isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY
  }

  static getUsageStats(): { totalRequests: number; successRate: number } {
    // This would be implemented with proper tracking in production
    return {
      totalRequests: 0,
      successRate: 1.0
    }
  }
}

// Type definitions for better TypeScript support
export interface OpenAIConfig {
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
}

export interface LearningAnalytics {
  userId: string
  videoId: string
  interactions: number
  timeSpent: number
  comprehensionScore: number
  engagementLevel: 'low' | 'medium' | 'high'
}

export const OPENAI_MODELS = {
  GPT4: 'gpt-4',
  GPT4_TURBO: 'gpt-4-1106-preview',
  GPT35_TURBO: 'gpt-3.5-turbo'
} as const

export const AI_RESPONSE_TYPES = {
  QUESTION: 'question',
  SUMMARY: 'summary',
  EXPLANATION: 'explanation',
  QUIZ: 'quiz',
  NOTES: 'notes',
  FEEDBACK: 'feedback'
} as const