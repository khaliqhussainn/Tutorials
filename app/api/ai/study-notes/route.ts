// app/api/ai/study-notes/route.ts - Fixed TypeScript errors
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

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
  practicalExamples: string[]
  commonMistakes: string[]
  nextSteps: string[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const requestBody = await request.json()
    const { 
      videoId, 
      videoTitle, 
      transcript, 
      courseTitle, 
      courseCategory 
    } = requestBody

    if (!videoId || !videoTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        notes: generateComprehensiveFallbackNotes(videoTitle, courseCategory, videoId),
        source: 'fallback'
      })
    }

    console.log(`📝 Generating comprehensive study notes for: "${videoTitle}"`)

    const prompt = buildComprehensiveStudyNotesPrompt(
      videoTitle, 
      transcript, 
      courseTitle, 
      courseCategory
    )

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "You are an expert educational content creator who specializes in creating comprehensive, professional-quality study materials. Your notes are used by students to master complex topics and succeed in their careers." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 3000,
      })

      const content = completion.choices[0]?.message?.content?.trim() || ""

      try {
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
        const parsed = JSON.parse(cleanContent)
        
        const notes: StudyNote = {
          id: `${videoId}_comprehensive_notes_${Date.now()}`,
          title: parsed.title || `Comprehensive Study Notes: ${videoTitle}`,
          content: parsed.content || 'Content not available',
          keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
          summary: parsed.summary || 'Summary not available',
          difficulty: parsed.difficulty || 'Intermediate',
          estimatedTime: parsed.estimatedTime || '20-30 minutes',
          tags: Array.isArray(parsed.tags) ? parsed.tags : [courseCategory?.toLowerCase() || 'general'],
          practicalExamples: Array.isArray(parsed.practicalExamples) ? parsed.practicalExamples : [],
          commonMistakes: Array.isArray(parsed.commonMistakes) ? parsed.commonMistakes : [],
          nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
          createdAt: new Date().toISOString()
        }
        
        return NextResponse.json({ 
          notes,
          source: 'openai'
        })
        
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError)
        return NextResponse.json({ 
          notes: generateComprehensiveFallbackNotes(videoTitle, courseCategory, videoId),
          source: 'fallback'
        })
      }

    } catch (openaiError) {
      console.error('OpenAI API Error:', openaiError)
      return NextResponse.json({ 
        notes: generateComprehensiveFallbackNotes(videoTitle, courseCategory, videoId),
        source: 'fallback'
      })
    }

  } catch (error) {
    console.error('Study notes generation error:', error)
    return NextResponse.json({ 
      notes: generateComprehensiveFallbackNotes('Video Content', 'General', 'fallback'),
      source: 'fallback'
    })
  }
}

function buildComprehensiveStudyNotesPrompt(
  videoTitle: string,
  transcript: string,
  courseTitle: string,
  courseCategory: string
): string {
  return `Create comprehensive, professional-quality study notes for the educational video: "${videoTitle}"

CONTEXT:
Title: "${videoTitle}"
Course: "${courseTitle || 'N/A'}"
Category: "${courseCategory || 'General'}"
Content Source: ${transcript ? 'Full transcript available' : 'Title and course context'}
${transcript ? `Transcript: ${transcript.substring(0, 2500)}...` : ''}

REQUIREMENTS:
Create detailed, professional study notes that serve as a complete reference guide. These notes should be:
1. Comprehensive enough to understand the topic without watching the video
2. Structured for easy review and quick reference
3. Include practical applications and real-world context
4. Address common challenges and misconceptions
5. Provide clear next steps for continued learning

CONTENT STRUCTURE:
1. **Detailed Content**: In-depth explanations with examples
2. **Key Points**: 7-10 essential takeaways for quick review
3. **Practical Examples**: Real-world applications and use cases
4. **Common Mistakes**: What to avoid and why
5. **Next Steps**: Recommended follow-up learning
6. **Professional Context**: How this applies in workplace/career

TONE: Professional yet accessible, like notes from an expert instructor

RESPONSE FORMAT (JSON only):
{
  "title": "Comprehensive Study Guide: ${videoTitle}",
  "content": "DETAILED COMPREHENSIVE CONTENT (minimum 800 words):\n\n## Overview\n[Clear introduction explaining what this lesson covers and why it's important]\n\n## Core Concepts\n[Detailed explanations of main concepts with definitions, examples, and context]\n\n## Technical Details\n[Specific implementation details, syntax, methods, or processes]\n\n## Professional Applications\n[How these concepts apply in real work scenarios]\n\n## Best Practices\n[Industry standards and recommended approaches]\n\n## Integration & Advanced Usage\n[How this connects to other concepts and advanced applications]\n\n## Troubleshooting\n[Common issues and how to resolve them]",
  
  "keyPoints": [
    "Most important concept with specific details",
    "Second critical point with practical context",
    "Third essential takeaway with examples",
    "Fourth key principle with application",
    "Fifth important technique with reasoning",
    "Sixth crucial concept with implications",
    "Seventh vital point for mastery"
  ],
  
  "practicalExamples": [
    "Real-world scenario 1: Specific example of how to apply this knowledge",
    "Professional use case 2: Industry application with context",
    "Practical implementation 3: Step-by-step example"
  ],
  
  "commonMistakes": [
    "Frequent mistake 1: What people do wrong and why it causes problems",
    "Common error 2: Misconception and the correct approach",
    "Typical pitfall 3: How to avoid this issue"
  ],
  
  "nextSteps": [
    "Immediate next topic to study for progression",
    "Recommended practice exercises or projects",
    "Advanced concepts to explore after mastering this"
  ],
  
  "summary": "Comprehensive 3-4 sentence summary covering the main concepts, their importance, and key applications in professional contexts.",
  "difficulty": "Beginner/Intermediate/Advanced",
  "estimatedTime": "25-35 minutes",
  "tags": ["${courseCategory?.toLowerCase() || 'general'}", "specific_topic", "key_concept", "skill_area", "professional_development"]
}

Generate comprehensive, detailed notes that provide complete understanding of the topic. Make the content substantial and professionally valuable.`
}

function generateComprehensiveFallbackNotes(
  videoTitle: string,
  courseCategory: string,
  videoId: string
): StudyNote {
  const category = courseCategory || 'General'
  const title = videoTitle.toLowerCase()
  
  let content = ''
  let keyPoints: string[] = []
  let summary = ''
  let practicalExamples: string[] = []
  let commonMistakes: string[] = []
  let nextSteps: string[] = []
  let tags: string[] = [category.toLowerCase()]
  let difficulty = 'Intermediate'
  
  if (title.includes('react')) {
    content = `# Comprehensive Study Guide: ${videoTitle}

## Overview
React is a powerful JavaScript library for building user interfaces, particularly web applications. This lesson covers essential React concepts that form the foundation for modern front-end development. Understanding these concepts is crucial for building scalable, maintainable applications in professional environments.

## Core Concepts

### Component-Based Architecture
React applications are built using components - self-contained pieces of code that manage their own state and render UI elements. Components can be functional or class-based, with functional components being the modern standard.

### Virtual DOM
React uses a Virtual DOM to optimize rendering performance. Instead of directly manipulating the browser's DOM, React creates a virtual representation in memory, compares it with the previous state, and only updates the parts that have changed.

### JSX (JavaScript XML)
JSX allows you to write HTML-like syntax directly in JavaScript. It gets compiled to JavaScript function calls that create React elements. JSX makes component code more readable and maintainable.

## Technical Details

### State Management
- Local state: Managed within individual components using useState hook
- Global state: Shared across multiple components using Context API or external libraries
- State immutability: Always create new state objects rather than modifying existing ones

### Event Handling
React uses SyntheticEvents that wrap native browser events, providing consistent behavior across different browsers. Event handlers receive event objects as parameters and can access event properties and methods.

## Professional Applications
In professional development, React is used for:
- Single-page applications (SPAs) with complex user interactions
- E-commerce platforms with dynamic product catalogs
- Dashboard and admin interfaces with real-time data
- Mobile applications using React Native
- Progressive web applications (PWAs)

## Best Practices
- Keep components small and focused on single responsibilities
- Use meaningful component and variable names
- Implement proper error boundaries for production applications
- Optimize performance with React.memo and useMemo when needed
- Follow consistent code organization and file structure

## Integration & Advanced Usage
React integrates seamlessly with:
- State management libraries (Redux, Zustand, Jotai)
- Routing libraries (React Router, Next.js routing)
- Testing frameworks (Jest, React Testing Library)
- Build tools (Webpack, Vite, Create React App)
- Backend APIs through HTTP clients or GraphQL

## Troubleshooting
Common development issues include:
- Key prop warnings in lists (ensure unique keys for each item)
- State update timing issues (use useEffect for side effects)
- Performance bottlenecks (identify unnecessary re-renders)
- Memory leaks from uncleared intervals or subscriptions`

    keyPoints = [
      "Components are the building blocks of React applications, promoting reusability and maintainability",
      "Virtual DOM optimization ensures efficient rendering by minimizing actual DOM manipulations",
      "JSX syntax combines the power of JavaScript with HTML-like templates for intuitive UI development",
      "State management with hooks like useState enables dynamic, interactive user interfaces",
      "Props enable data flow from parent to child components, creating a unidirectional data flow",
      "Event handling in React uses SyntheticEvents for consistent cross-browser behavior",
      "Component lifecycle and effects (useEffect) manage side effects and cleanup operations"
    ]

    practicalExamples = [
      "E-commerce product catalog: Create reusable ProductCard components that display product information and handle user interactions like adding to cart",
      "Dashboard application: Build a real-time analytics dashboard using React components to display charts, metrics, and user data with automatic updates",
      "Form management: Implement complex forms with validation, error handling, and dynamic field generation using controlled components and state"
    ]

    commonMistakes = [
      "Directly mutating state objects instead of creating new ones, which prevents React from detecting changes and re-rendering components",
      "Missing key props in list items, causing React to inefficiently re-render and potentially lose component state",
      "Using useEffect without proper dependency arrays, leading to infinite loops or stale data issues"
    ]

    nextSteps = [
      "Learn React Hooks in depth, particularly useEffect, useContext, and custom hooks for advanced state management",
      "Explore React Router for building single-page applications with multiple views and navigation",
      "Study state management libraries like Redux or Zustand for complex application state handling"
    ]

    summary = "React is a component-based JavaScript library that revolutionizes front-end development through Virtual DOM optimization, JSX syntax, and unidirectional data flow. It enables developers to build scalable, maintainable user interfaces for modern web applications while providing powerful tools for state management and event handling."
    tags = ['react', 'javascript', 'frontend', 'components', 'jsx', 'virtual-dom', 'web-development']
    difficulty = 'Intermediate'
    
  } else if (title.includes('javascript')) {
    content = `# Comprehensive Study Guide: ${videoTitle}

## Overview
JavaScript is the cornerstone of modern web development, enabling dynamic, interactive experiences across websites and applications. This lesson covers fundamental JavaScript concepts that are essential for both front-end and back-end development, providing the foundation for advanced programming techniques.

## Core Concepts

### Variables and Data Types
JavaScript supports multiple data types including primitives (string, number, boolean, null, undefined, symbol) and objects (arrays, functions, objects). Understanding variable declaration with let, const, and var is crucial for proper scope management.

### Functions and Scope
Functions are first-class objects in JavaScript, meaning they can be assigned to variables, passed as arguments, and returned from other functions. Scope determines variable accessibility, with function scope, block scope, and lexical scope being key concepts.

### Asynchronous Programming
JavaScript's event-driven nature requires understanding of callbacks, promises, and async/await for handling asynchronous operations like API calls, file operations, and timers.

## Technical Details

### ES6+ Features
- Arrow functions: Concise function syntax with lexical this binding
- Destructuring: Extract values from arrays and objects efficiently
- Template literals: String interpolation with embedded expressions
- Modules: Import/export functionality for code organization

### DOM Manipulation
- Selecting elements: getElementById, querySelector, querySelectorAll
- Modifying content: innerHTML, textContent, createElement
- Event handling: addEventListener, event delegation, event propagation

## Professional Applications
JavaScript powers:
- Interactive web interfaces with dynamic content updates
- Server-side applications using Node.js for scalable backend services
- Mobile app development with React Native and Ionic
- Desktop applications using Electron framework
- Game development with HTML5 Canvas and WebGL

## Best Practices
- Use strict mode to catch common coding mistakes
- Implement proper error handling with try-catch blocks
- Follow naming conventions and write self-documenting code
- Use modern ES6+ features for cleaner, more maintainable code
- Implement proper security measures to prevent XSS and injection attacks

## Integration & Advanced Usage
JavaScript integrates with:
- Frontend frameworks (React, Vue.js, Angular)
- Backend runtime environments (Node.js, Deno)
- Databases (MongoDB with JavaScript, JSON-based storage)
- Build tools and bundlers (Webpack, Rollup, Vite)
- Testing frameworks (Jest, Mocha, Cypress)

## Troubleshooting
Common JavaScript issues:
- Type coercion unexpected behavior (use strict equality ===)
- Scope-related bugs (understand hoisting and closure)
- Asynchronous code timing issues (proper promise handling)
- Memory leaks from uncleaned event listeners or closures`

    keyPoints = [
      "Variables declared with let and const have block scope, while var has function scope, affecting where variables can be accessed",
      "Functions are first-class objects that can be stored in variables, passed as arguments, and returned from other functions",
      "Asynchronous programming with promises and async/await enables non-blocking code execution for better performance",
      "ES6+ features like destructuring, template literals, and arrow functions improve code readability and maintainability",
      "Event-driven programming allows JavaScript to respond to user interactions and system events dynamically",
      "Closure concept enables functions to access variables from their outer scope even after the outer function has returned",
      "Prototypal inheritance allows objects to inherit properties and methods from other objects in JavaScript"
    ]

    practicalExamples = [
      "API integration: Fetch data from REST APIs using async/await, handle loading states, and update UI components with received data",
      "Form validation: Implement real-time form validation with custom rules, error messaging, and user feedback for improved user experience",
      "Interactive UI components: Create dynamic elements like modal windows, dropdown menus, and image carousels with event handling"
    ]

    commonMistakes = [
      "Confusing == and === operators, leading to unexpected type coercion and logical errors in comparisons",
      "Not understanding hoisting behavior, which can cause variables to be undefined when accessed before declaration",
      "Creating memory leaks by not removing event listeners or clearing intervals/timeouts when they're no longer needed"
    ]

    nextSteps = [
      "Explore advanced JavaScript patterns like module patterns, observer patterns, and functional programming concepts",
      "Learn a modern JavaScript framework like React, Vue.js, or Angular for building complex user interfaces",
      "Study Node.js for server-side JavaScript development and building full-stack applications"
    ]

    summary = "JavaScript is a versatile, dynamic programming language that enables interactive web experiences through DOM manipulation, asynchronous programming, and modern ES6+ features. It serves as the foundation for both client-side and server-side development, making it essential for modern web development careers."
    tags = ['javascript', 'programming', 'web-development', 'dom', 'async', 'es6', 'functions']
    difficulty = 'Beginner'
  }
  
  // Generic comprehensive content for other topics
  if (!content) {
    content = `# Comprehensive Study Guide: ${videoTitle}

## Overview
This lesson covers essential concepts in ${category} that are fundamental for professional development and career advancement. Understanding these principles is crucial for building expertise and applying knowledge effectively in real-world scenarios.

## Core Concepts
The main topics covered include foundational principles, practical applications, and industry best practices. These concepts form the building blocks for more advanced learning and professional implementation.

## Technical Details
Specific techniques, methodologies, and implementation strategies are explored in depth, providing practical knowledge that can be immediately applied to projects and professional work.

## Professional Applications
These concepts are widely used in industry for solving real-world problems, improving efficiency, and creating valuable solutions that meet business and user needs.

## Best Practices
Industry standards and recommended approaches ensure professional-quality implementations. Following established patterns and methodologies leads to maintainable, scalable solutions.

## Integration & Advanced Usage
Understanding how these concepts connect to other technologies and methodologies enables more sophisticated implementations and career growth opportunities.

## Troubleshooting
Common challenges and their solutions help avoid typical pitfalls and ensure successful project outcomes.`

    keyPoints = [
      `Core principles of ${category} that form the foundation for advanced learning`,
      "Practical implementation techniques that can be applied immediately to projects",
      "Industry best practices that ensure professional-quality work and career advancement",
      "Integration strategies for connecting with other technologies and methodologies",
      "Common challenges and proven solutions for successful project outcomes",
      "Professional applications that demonstrate real-world value and business impact",
      "Next steps for continued learning and skill development in this area"
    ]

    practicalExamples = [
      `Professional project scenario: Applying ${category} concepts to solve real business problems`,
      `Industry use case: How leading companies implement these techniques for competitive advantage`,
      `Career application: Using this knowledge to advance professional development and opportunities`
    ]

    commonMistakes = [
      "Skipping foundational concepts and jumping to advanced topics without proper understanding",
      "Focusing only on theory without practical application and hands-on experience",
      "Not considering integration with existing systems and methodologies in professional environments"
    ]

    nextSteps = [
      `Advanced topics in ${category} that build upon these foundational concepts`,
      "Related technologies and methodologies that complement this knowledge",
      "Professional certifications and career paths that utilize these skills"
    ]

    summary = `This lesson provides comprehensive coverage of ${category} concepts essential for professional development, including practical applications, industry best practices, and integration strategies for real-world implementation.`
    tags = [category.toLowerCase(), 'fundamentals', 'professional-development', 'best-practices']
  }
  
  return {
    id: `${videoId}_comprehensive_notes_${Date.now()}`,
    title: `Comprehensive Study Guide: ${videoTitle}`,
    content,
    keyPoints,
    summary,
    difficulty,
    estimatedTime: '25-35 minutes',
    tags,
    practicalExamples,
    commonMistakes,
    nextSteps,
    createdAt: new Date().toISOString()
  }
}