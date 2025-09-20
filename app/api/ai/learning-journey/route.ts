// app/api/ai/learning-journey/route.ts
// Generates personalized learning roadmaps based on video content and course category
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface LearningStep {
  id: number
  title: string
  description: string
  category: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  estimatedTime: string
  status: 'completed' | 'current' | 'upcoming'
  skills: string[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { videoTitle, courseTitle, courseCategory, description, currentProgress } = await request.json()

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        steps: generateFallbackJourney(courseCategory || 'general', currentProgress)
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

    const prompt = buildLearningJourneyPrompt(
      videoTitle, 
      courseTitle, 
      courseCategory, 
      description, 
      currentProgress
    )

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return NextResponse.json(parsed)
      }
    } catch (e) {
      console.error('Failed to parse learning journey JSON:', e)
    }

    // Fallback to static journey
    return NextResponse.json({ 
      steps: generateFallbackJourney(courseCategory || 'general', currentProgress)
    })

  } catch (error) {
    console.error('Learning journey error:', error)
    return NextResponse.json({ 
      steps: generateFallbackJourney('general', 0)
    })
  }
}

function buildLearningJourneyPrompt(
  videoTitle: string,
  courseTitle: string,
  courseCategory: string,
  description: string,
  currentProgress: number
): string {
  return `Create a personalized learning journey for someone studying "${courseTitle}" in the ${courseCategory} field.

Current Context:
- Video: "${videoTitle}"
- Course: "${courseTitle}"
- Category: "${courseCategory}"
- Description: "${description}"
- Current Progress: ${currentProgress}%

Generate a structured learning path with 5-6 progressive steps that will help the learner advance from their current level to mastery in this field.

Consider the category to determine the most relevant skills:
- Web Development: HTML, CSS, JavaScript, React, Node.js, databases
- Cybersecurity: Security fundamentals, network security, ethical hacking, compliance
- Data Science: Python, statistics, machine learning, data visualization
- Mobile Development: React Native, Flutter, iOS/Android development
- DevOps: CI/CD, containerization, cloud platforms, monitoring

Return as JSON:
{
  "steps": [
    {
      "id": 1,
      "title": "Step title",
      "description": "Detailed description of what to learn",
      "category": "${courseCategory}",
      "difficulty": "Beginner|Intermediate|Advanced",
      "estimatedTime": "2-3 weeks",
      "status": "completed|current|upcoming",
      "skills": ["skill1", "skill2", "skill3"]
    }
  ]
}

Make the journey:
1. Progressive (easy to hard)
2. Practical (hands-on learning)
3. Industry-relevant
4. Specific to the ${courseCategory} field
5. Set the first step as "current" and others as "upcoming"`
}

function generateFallbackJourney(category: string, currentProgress: number): LearningStep[] {
  const categoryLower = category.toLowerCase()
  
  if (categoryLower.includes('web') || categoryLower.includes('frontend') || categoryLower.includes('html') || categoryLower.includes('css') || categoryLower.includes('javascript')) {
    return [
      {
        id: 1,
        title: "HTML & CSS Foundations",
        description: "Master HTML structure, semantic markup, and CSS styling fundamentals",
        category: "Web Development",
        difficulty: "Beginner",
        estimatedTime: "2-3 weeks",
        status: currentProgress > 0 ? "completed" : "current",
        skills: ["HTML5", "CSS3", "Responsive Design", "Accessibility"]
      },
      {
        id: 2,
        title: "JavaScript Programming",
        description: "Learn core JavaScript concepts, DOM manipulation, and modern ES6+ features",
        category: "Web Development",
        difficulty: "Beginner",
        estimatedTime: "3-4 weeks",
        status: currentProgress > 30 ? "current" : "upcoming",
        skills: ["ES6+", "DOM", "Event Handling", "Async Programming"]
      },
      {
        id: 3,
        title: "Frontend Frameworks",
        description: "Build dynamic applications with React or Vue.js",
        category: "Web Development",
        difficulty: "Intermediate",
        estimatedTime: "4-5 weeks",
        status: currentProgress > 60 ? "current" : "upcoming",
        skills: ["React", "Components", "State Management", "Hooks"]
      },
      {
        id: 4,
        title: "Backend Development",
        description: "Create server-side applications with Node.js and databases",
        category: "Web Development",
        difficulty: "Intermediate",
        estimatedTime: "4-6 weeks",
        status: "upcoming",
        skills: ["Node.js", "Express", "MongoDB", "REST APIs"]
      },
      {
        id: 5,
        title: "Full-Stack Projects",
        description: "Build complete web applications from frontend to backend",
        category: "Web Development",
        difficulty: "Advanced",
        estimatedTime: "6-8 weeks",
        status: "upcoming",
        skills: ["Full-Stack", "Authentication", "Deployment", "Testing"]
      }
    ]
  }
  
  if (categoryLower.includes('cyber') || categoryLower.includes('security')) {
    return [
      {
        id: 1,
        title: "Security Fundamentals",
        description: "Understand basic security concepts, threats, and defense strategies",
        category: "Cybersecurity",
        difficulty: "Beginner",
        estimatedTime: "2-3 weeks",
        status: "current",
        skills: ["Threat Modeling", "Risk Assessment", "Security Policies", "Compliance"]
      },
      {
        id: 2,
        title: "Network Security",
        description: "Learn to secure networks, implement firewalls, and monitor traffic",
        category: "Cybersecurity",
        difficulty: "Intermediate",
        estimatedTime: "3-4 weeks",
        status: "upcoming",
        skills: ["Firewalls", "IDS/IPS", "VPN", "Network Protocols"]
      },
      {
        id: 3,
        title: "Incident Response",
        description: "Develop skills to respond to and investigate security incidents",
        category: "Cybersecurity",
        difficulty: "Intermediate",
        estimatedTime: "3-4 weeks",
        status: "upcoming",
        skills: ["Forensics", "Incident Handling", "Log Analysis", "Recovery"]
      },
      {
        id: 4,
        title: "Ethical Hacking",
        description: "Learn penetration testing and vulnerability assessment techniques",
        category: "Cybersecurity",
        difficulty: "Advanced",
        estimatedTime: "5-6 weeks",
        status: "upcoming",
        skills: ["Penetration Testing", "Vulnerability Scanning", "Social Engineering", "Reporting"]
      },
      {
        id: 5,
        title: "Security Leadership",
        description: "Develop skills in security management and strategic planning",
        category: "Cybersecurity",
        difficulty: "Advanced",
        estimatedTime: "4-5 weeks",
        status: "upcoming",
        skills: ["Security Architecture", "Team Leadership", "Budget Planning", "Compliance Management"]
      }
    ]
  }

  if (categoryLower.includes('data') || categoryLower.includes('python') || categoryLower.includes('analytics')) {
    return [
      {
        id: 1,
        title: "Python Programming",
        description: "Master Python fundamentals and data manipulation libraries",
        category: "Data Science",
        difficulty: "Beginner",
        estimatedTime: "3-4 weeks",
        status: "current",
        skills: ["Python", "Pandas", "NumPy", "Data Structures"]
      },
      {
        id: 2,
        title: "Data Analysis & Visualization",
        description: "Learn to analyze data and create compelling visualizations",
        category: "Data Science",
        difficulty: "Intermediate",
        estimatedTime: "3-4 weeks",
        status: "upcoming",
        skills: ["Matplotlib", "Seaborn", "Statistical Analysis", "Data Cleaning"]
      },
      {
        id: 3,
        title: "Machine Learning",
        description: "Build predictive models using machine learning algorithms",
        category: "Data Science",
        difficulty: "Intermediate",
        estimatedTime: "5-6 weeks",
        status: "upcoming",
        skills: ["Scikit-learn", "Regression", "Classification", "Model Evaluation"]
      },
      {
        id: 4,
        title: "Advanced ML & Deep Learning",
        description: "Explore neural networks and advanced machine learning techniques",
        category: "Data Science",
        difficulty: "Advanced",
        estimatedTime: "6-8 weeks",
        status: "upcoming",
        skills: ["TensorFlow", "Keras", "Neural Networks", "Deep Learning"]
      },
      {
        id: 5,
        title: "MLOps & Production",
        description: "Deploy machine learning models in production environments",
        category: "Data Science",
        difficulty: "Advanced",
        estimatedTime: "4-5 weeks",
        status: "upcoming",
        skills: ["Model Deployment", "API Development", "Monitoring", "CI/CD for ML"]
      }
    ]
  }

  // Generic fallback journey
  return [
    {
      id: 1,
      title: "Foundation Knowledge",
      description: "Build strong fundamentals in the core concepts of this field",
      category: category || "General",
      difficulty: "Beginner",
      estimatedTime: "2-3 weeks",
      status: "current",
      skills: ["Core Concepts", "Best Practices", "Industry Standards", "Basic Tools"]
    },
    {
      id: 2,
      title: "Practical Application",
      description: "Apply your knowledge through hands-on projects and exercises",
      category: category || "General",
      difficulty: "Intermediate",
      estimatedTime: "3-4 weeks",
      status: "upcoming",
      skills: ["Project Work", "Problem Solving", "Real-world Scenarios", "Tool Proficiency"]
    },
    {
      id: 3,
      title: "Advanced Techniques",
      description: "Master advanced concepts and specialized techniques",
      category: category || "General",
      difficulty: "Intermediate",
      estimatedTime: "4-5 weeks",
      status: "upcoming",
      skills: ["Advanced Methods", "Optimization", "Complex Projects", "Professional Tools"]
    },
    {
      id: 4,
      title: "Professional Development",
      description: "Develop professional skills and industry expertise",
      category: category || "General",
      difficulty: "Advanced",
      estimatedTime: "4-6 weeks",
      status: "upcoming",
      skills: ["Leadership", "Communication", "Project Management", "Mentoring"]
    },
    {
      id: 5,
      title: "Specialization & Mastery",
      description: "Choose a specialization and achieve mastery in your chosen area",
      category: category || "General",
      difficulty: "Advanced",
      estimatedTime: "6-8 weeks",
      status: "upcoming",
      skills: ["Specialization", "Expert Knowledge", "Innovation", "Thought Leadership"]
    }
  ]
}