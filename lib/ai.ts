import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function generateTestQuestions(
  videoTitle: string, 
  description: string, 
  aiPrompt: string
) {
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
    
    Make sure the questions are relevant to the video content and the correct answer index is accurate.
    `
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    throw new Error('Failed to parse AI response')
  } catch (error) {
    console.error('AI generation error:', error)
    throw new Error('Failed to generate test questions')
  }
}