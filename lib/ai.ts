// lib/ai.ts - AI test generation (requires Google AI API)
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function generateTestQuestions(
  videoTitle: string, 
  description: string, 
  aiPrompt: string
) {
  if (!process.env.GEMINI_API_KEY) {
    // Fallback to simple questions if no AI API
    return [
      {
        question: `What is the main topic covered in "${videoTitle}"?`,
        options: [
          "The content described in the video",
          "Unrelated topic A",
          "Unrelated topic B", 
          "Unrelated topic C"
        ],
        correct: 0
      },
      {
        question: `Based on the video about "${aiPrompt}", what should you do next?`,
        options: [
          "Ignore the content",
          "Practice and apply what you learned",
          "Skip to advanced topics",
          "Avoid using this knowledge"
        ],
        correct: 1
      }
    ]
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    
    const prompt = `
    Generate 3 multiple choice questions based on this video content:
    
    Title: ${videoTitle}
    Description: ${description}
    Additional Context: ${aiPrompt}
    
    Return the response as a JSON array with this exact format:
    [
      {
        "question": "Question text here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct": 0
      }
    ]
    
    Make sure:
    1. Questions are relevant to the video content
    2. The correct answer index is accurate (0-3)
    3. Options are plausible but only one is clearly correct
    4. Questions test understanding, not just memorization
    `
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const questions = JSON.parse(jsonMatch[0])
      return questions.slice(0, 3) // Ensure max 3 questions
    }
    
    throw new Error('Failed to parse AI response')
  } catch (error) {
    console.error('AI generation error:', error)
    
    // Fallback questions if AI fails
    return [
      {
        question: `What is the main concept covered in "${videoTitle}"?`,
        options: [
          "The primary topic explained in this video",
          "An unrelated concept",
          "A different subject entirely",
          "None of the above"
        ],
        correct: 0
      }
    ]
  }
}