// app/api/ai/study-notes/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface StudyNote {
  id: string
  title: string
  content: string
  keyPoints: string[]
  summary: string
  difficulty: string
  estimatedTime: string
  tags: string[]
  createdAt: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { videoId, videoTitle, transcript, courseTitle, courseCategory } = await request.json()

    if (!process.env.GEMINI_API_KEY || !transcript) {
      return NextResponse.json({ 
        notes: generateFallbackNotes(videoTitle, courseCategory)
      })
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      }
    })

    const prompt = buildStudyNotesPrompt(
      videoTitle, 
      transcript, 
      courseTitle, 
      courseCategory
    )

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return NextResponse.json({ notes: parsed })
      }
    } catch (e) {
      console.error('Failed to parse study notes JSON:', e)
    }

    // Fallback to generated notes
    return NextResponse.json({ 
      notes: generateFallbackNotes(videoTitle, courseCategory)
    })

  } catch (error) {
    console.error('Study notes generation error:', error)
    return NextResponse.json({ 
      notes: generateFallbackNotes('Lesson', 'General')
    })
  }
}

function buildStudyNotesPrompt(
  videoTitle: string,
  transcript: string,
  courseTitle: string,
  courseCategory: string
): string {
  return `Create comprehensive study notes from this educational video transcript.

Video Title: "${videoTitle}"
Course: "${courseTitle}"
Category: "${courseCategory}"
Transcript: ${transcript.substring(0, 4000)}

Generate structured study notes that include:
1. Clear overview and introduction
2. Key concepts and definitions
3. Important points and takeaways
4. Practical examples and applications
5. Summary of main ideas
6. 5-7 key learning points
7. Relevant tags for categorization

Focus on:
- Making complex concepts easy to understand
- Highlighting actionable insights
- Organizing information logically
- Using bullet points and clear structure
- Emphasizing practical applications

Return as JSON:
{
  "id": "unique_id",
  "title": "Study Notes: [Video Title]",
  "content": "Formatted markdown content with headers, bullet points, and clear structure",
  "keyPoints": [
    "Key learning point 1",
    "Key learning point 2",
    "Key learning point 3",
    "Key learning point 4",
    "Key learning point 5"
  ],
  "summary": "Concise 2-3 sentence summary of the main concepts",
  "difficulty": "Beginner|Intermediate|Advanced",
  "estimatedTime": "10-15 minutes",
  "tags": ["tag1", "tag2", "tag3"],
  "createdAt": "2024-01-01T00:00:00.000Z"
}

Make the content educational, well-structured, and easy to review.`
}

function generateFallbackNotes(videoTitle: string, courseCategory: string): StudyNote {
  const category = courseCategory || 'General'
  const difficulty = determineDifficulty(videoTitle, category)
  
  // Generate category-specific content
  let content = `# Study Notes: ${videoTitle}\n\n`
  let keyPoints: string[] = []
  let summary = ''
  let tags: string[] = []

  if (category.toLowerCase().includes('web') || category.toLowerCase().includes('frontend') || category.toLowerCase().includes('html') || category.toLowerCase().includes('css') || category.toLowerCase().includes('javascript')) {
    content += `## Overview\nThis lesson covers important web development concepts related to ${videoTitle}.\n\n`
    content += `## Key Concepts\n\n### Frontend Development\n- Understanding HTML structure and semantics\n- Styling with CSS and responsive design principles\n- JavaScript functionality and interactivity\n- Modern development practices\n\n`
    content += `### Best Practices\n- Write clean, semantic code\n- Follow accessibility guidelines\n- Optimize for performance\n- Use version control effectively\n\n`
    content += `### Practical Applications\n- Building responsive websites\n- Creating interactive user interfaces\n- Implementing modern design patterns\n- Debugging and testing code\n\n`
    content += `## Summary\nThis lesson provides essential knowledge for web development, focusing on practical skills and industry best practices.`

    keyPoints = [
      "Master HTML structure and semantic markup for better accessibility",
      "Understand CSS styling principles and responsive design techniques",
      "Learn JavaScript fundamentals for creating interactive experiences",
      "Follow web development best practices for clean, maintainable code",
      "Apply modern development workflows and testing strategies"
    ]

    summary = `This lesson covers essential web development concepts including HTML, CSS, and JavaScript fundamentals. It emphasizes practical application and modern development best practices.`
    tags = ["Web Development", "Frontend", "HTML", "CSS", "JavaScript", "Best Practices"]

  } else if (category.toLowerCase().includes('cyber') || category.toLowerCase().includes('security')) {
    content += `## Overview\nThis lesson explores cybersecurity concepts and practices related to ${videoTitle}.\n\n`
    content += `## Key Concepts\n\n### Security Fundamentals\n- Understanding threat landscapes and attack vectors\n- Risk assessment and management strategies\n- Security policies and compliance requirements\n- Incident response procedures\n\n`
    content += `### Technical Implementation\n- Network security configurations\n- Access control mechanisms\n- Encryption and data protection\n- Security monitoring and logging\n\n`
    content += `### Best Practices\n- Regular security assessments\n- Employee training and awareness\n- Continuous monitoring and updates\n- Documentation and reporting\n\n`
    content += `## Summary\nThis lesson provides crucial cybersecurity knowledge for protecting systems and data against modern threats.`

    keyPoints = [
      "Understand common cybersecurity threats and attack methods",
      "Implement effective security controls and monitoring systems",
      "Develop incident response and recovery procedures",
      "Maintain compliance with security standards and regulations",
      "Create a culture of security awareness within organizations"
    ]

    summary = `This lesson covers fundamental cybersecurity concepts, threat analysis, and defensive strategies. It emphasizes practical implementation of security controls and best practices.`
    tags = ["Cybersecurity", "Network Security", "Risk Management", "Compliance", "Incident Response"]

  } else if (category.toLowerCase().includes('data') || category.toLowerCase().includes('python') || category.toLowerCase().includes('analytics')) {
    content += `## Overview\nThis lesson covers data science and analytics concepts related to ${videoTitle}.\n\n`
    content += `## Key Concepts\n\n### Data Analysis\n- Data collection and cleaning techniques\n- Statistical analysis and interpretation\n- Data visualization best practices\n- Pattern recognition and insights\n\n`
    content += `### Technical Skills\n- Python programming for data science\n- Working with pandas and numpy libraries\n- Creating meaningful visualizations\n- Statistical modeling and validation\n\n`
    content += `### Practical Applications\n- Business intelligence and reporting\n- Predictive modeling and forecasting\n- Data-driven decision making\n- Machine learning implementation\n\n`
    content += `## Summary\nThis lesson provides essential data science skills for analyzing, interpreting, and extracting insights from data.`

    keyPoints = [
      "Master data collection, cleaning, and preparation techniques",
      "Understand statistical analysis methods and interpretation",
      "Create effective data visualizations for communication",
      "Apply Python and relevant libraries for data analysis",
      "Develop insights and recommendations from data findings"
    ]

    summary = `This lesson covers essential data science concepts including data analysis, statistical methods, and visualization techniques. It emphasizes practical Python programming and real-world applications.`
    tags = ["Data Science", "Python", "Analytics", "Statistics", "Visualization", "Machine Learning"]

  } else {
    // Generic content
    content += `## Overview\nThis lesson covers important concepts and practices related to ${videoTitle}.\n\n`
    content += `## Key Learning Areas\n\n### Core Concepts\n- Fundamental principles and theories\n- Industry standards and best practices\n- Practical applications and use cases\n- Common challenges and solutions\n\n`
    content += `### Skills Development\n- Technical proficiency and tools\n- Problem-solving methodologies\n- Critical thinking and analysis\n- Communication and collaboration\n\n`
    content += `### Practical Implementation\n- Real-world project applications\n- Testing and validation approaches\n- Continuous learning and improvement\n- Professional development strategies\n\n`
    content += `## Summary\nThis lesson provides valuable knowledge and skills for professional growth and practical application in the field.`

    keyPoints = [
      "Understand core concepts and fundamental principles",
      "Apply best practices and industry standards",
      "Develop practical skills through hands-on experience",
      "Solve real-world problems using learned techniques",
      "Continue professional development and skill advancement"
    ]

    summary = `This lesson covers essential concepts and practical skills in ${category}. It emphasizes both theoretical understanding and real-world application.`
    tags = [category, "Fundamentals", "Best Practices", "Professional Development", "Practical Skills"]
  }

  return {
    id: Date.now().toString(),
    title: `Study Notes: ${videoTitle}`,
    content,
    keyPoints,
    summary,
    difficulty,
    estimatedTime: "15-20 minutes",
    tags,
    createdAt: new Date().toISOString()
  }
}

function determineDifficulty(videoTitle: string, category: string): string {
  const title = videoTitle.toLowerCase()
  
  if (title.includes('intro') || title.includes('basic') || title.includes('beginner') || title.includes('fundamentals') || title.includes('getting started')) {
    return 'Beginner'
  } else if (title.includes('advanced') || title.includes('expert') || title.includes('master') || title.includes('complex') || title.includes('deep dive')) {
    return 'Advanced'
  } else {
    return 'Intermediate'
  }
}