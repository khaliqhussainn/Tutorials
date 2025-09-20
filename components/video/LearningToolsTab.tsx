"use client"
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import {
  Brain,
  MessageSquare,
  MapPin,
  FileText,
  Send,
  Loader2,
  Bot,
  User,
  ChevronRight,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  Lightbulb,
  TrendingUp,
  Award,
  AlertCircle,
  Sparkles,
  BookOpen,
  Target
} from "lucide-react"

interface Video {
  id: string
  title: string
  description?: string
  courseId?: string
  course?: {
    title: string
    category: string
  }
  transcript?: {
    content: string
    status: string
    segments?: any[]
  }
}

interface LearningToolsTabProps {
  video: Video | null
  getProgressPercentage: () => number
}

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  isLoading?: boolean
}

interface LearningPathStep {
  id: number
  title: string
  description: string
  category: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  estimatedTime: string
  status: 'completed' | 'current' | 'upcoming'
  skills: string[]
}

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

export function LearningToolsTab({
  video,
  getProgressPercentage,
}: LearningToolsTabProps) {
  // AI Q&A State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [userQuery, setUserQuery] = useState('')
  const [isAILoading, setIsAILoading] = useState(false)

  // Learning Journey State
  const [learningPath, setLearningPath] = useState<LearningPathStep[]>([])
  const [isPathLoading, setIsPathLoading] = useState(false)

  // Study Notes State
  const [studyNotes, setStudyNotes] = useState<StudyNote | null>(null)
  const [isNotesLoading, setIsNotesLoading] = useState(false)

  // Initialize features when video changes
  useEffect(() => {
    if (video) {
      generateLearningPath()
      generateStudyNotes()
    }
  }, [video])

  // 1. AI Q&A Feature - Enhanced to answer ANY questions using Gemini
  const handleAIQuestion = async () => {
    if (!userQuery.trim() || !video) return

    const userMessage: ChatMessage = {
      id: Date.now() + '-user',
      type: 'user',
      content: userQuery,
      timestamp: new Date()
    }

    const loadingMessage: ChatMessage = {
      id: Date.now() + '-loading',
      type: 'ai',
      content: 'Thinking...',
      timestamp: new Date(),
      isLoading: true
    }

    setChatMessages(prev => [...prev, userMessage, loadingMessage])
    setIsAILoading(true)
    setUserQuery('')

    try {
      const response = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userQuery,
          videoId: video.id,
          videoTitle: video.title,
          transcript: video.transcript?.content,
          courseTitle: video.course?.title,
          courseCategory: video.course?.category,
          type: 'question',
          context: chatMessages.slice(-3)
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        const aiMessage: ChatMessage = {
          id: Date.now() + '-ai',
          type: 'ai',
          content: data.content,
          timestamp: new Date()
        }

        setChatMessages(prev => 
          prev.filter(msg => !msg.isLoading).concat([userMessage, aiMessage])
        )
      } else {
        throw new Error('Failed to get AI response')
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: Date.now() + '-error',
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }

      setChatMessages(prev => 
        prev.filter(msg => !msg.isLoading).concat([userMessage, errorMessage])
      )
    } finally {
      setIsAILoading(false)
    }
  }

  // 2. Learning Journey/Path Generator - Field-specific roadmaps
  const generateLearningPath = async () => {
    if (!video) return

    setIsPathLoading(true)
    try {
      const response = await fetch('/api/ai/learning-journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTitle: video.title,
          courseTitle: video.course?.title,
          courseCategory: video.course?.category,
          description: video.description,
          currentProgress: getProgressPercentage()
        })
      })

      if (response.ok) {
        const data = await response.json()
        setLearningPath(data.steps || [])
      }
    } catch (error) {
      console.error('Failed to generate learning path:', error)
      generateFallbackPath()
    } finally {
      setIsPathLoading(false)
    }
  }

  const generateFallbackPath = () => {
    const category = video?.course?.category?.toLowerCase() || 'general'
    let steps: LearningPathStep[] = []

    if (category.includes('web') || category.includes('frontend') || category.includes('html') || category.includes('css') || category.includes('javascript')) {
      steps = [
        {
          id: 1,
          title: "HTML & CSS Foundations",
          description: "Master structure, semantics, and styling fundamentals",
          category: "Web Development",
          difficulty: "Beginner",
          estimatedTime: "2-3 weeks",
          status: "current",
          skills: ["HTML5", "CSS3", "Responsive Design", "Accessibility"]
        },
        {
          id: 2,
          title: "JavaScript Programming",
          description: "Learn core JS concepts and DOM manipulation",
          category: "Web Development",
          difficulty: "Intermediate",
          estimatedTime: "3-4 weeks",
          status: "upcoming",
          skills: ["ES6+", "DOM", "Events", "Async/Await"]
        },
        {
          id: 3,
          title: "React Framework",
          description: "Build modern applications with React",
          category: "Web Development",
          difficulty: "Intermediate",
          estimatedTime: "4-5 weeks",
          status: "upcoming",
          skills: ["Components", "Hooks", "State", "Router"]
        },
        {
          id: 4,
          title: "Full-Stack Development",
          description: "Backend APIs, databases, and deployment",
          category: "Web Development",
          difficulty: "Advanced",
          estimatedTime: "6-8 weeks",
          status: "upcoming",
          skills: ["Node.js", "APIs", "Databases", "Deployment"]
        }
      ]
    } else if (category.includes('cyber') || category.includes('security')) {
      steps = [
        {
          id: 1,
          title: "Security Fundamentals",
          description: "Basic security concepts and threat landscape",
          category: "Cybersecurity",
          difficulty: "Beginner",
          estimatedTime: "2-3 weeks",
          status: "current",
          skills: ["Threat Modeling", "Risk Assessment", "Policies"]
        },
        {
          id: 2,
          title: "Network Security",
          description: "Secure network design and monitoring",
          category: "Cybersecurity",
          difficulty: "Intermediate",
          estimatedTime: "3-4 weeks",
          status: "upcoming",
          skills: ["Firewalls", "IDS/IPS", "VPN", "Protocols"]
        },
        {
          id: 3,
          title: "Ethical Hacking",
          description: "Penetration testing and vulnerability assessment",
          category: "Cybersecurity",
          difficulty: "Advanced",
          estimatedTime: "4-6 weeks",
          status: "upcoming",
          skills: ["Pentesting", "Vuln Scanning", "Social Engineering"]
        }
      ]
    } else {
      steps = [
        {
          id: 1,
          title: "Foundation Knowledge",
          description: "Build strong fundamentals in the subject area",
          category: "General",
          difficulty: "Beginner",
          estimatedTime: "2-3 weeks",
          status: "current",
          skills: ["Core Concepts", "Best Practices", "Standards"]
        },
        {
          id: 2,
          title: "Practical Application",
          description: "Apply knowledge through hands-on projects",
          category: "General",
          difficulty: "Intermediate",
          estimatedTime: "3-4 weeks",
          status: "upcoming",
          skills: ["Projects", "Problem Solving", "Real-world"]
        },
        {
          id: 3,
          title: "Advanced Mastery",
          description: "Master advanced topics and specializations",
          category: "General",
          difficulty: "Advanced",
          estimatedTime: "4-6 weeks",
          status: "upcoming",
          skills: ["Advanced Techniques", "Optimization", "Leadership"]
        }
      ]
    }

    setLearningPath(steps)
  }

  // 3. AI Study Notes Generator - Video-specific notes
  const generateStudyNotes = async () => {
    if (!video) return

    setIsNotesLoading(true)
    try {
      const response = await fetch('/api/ai/study-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          videoTitle: video.title,
          transcript: video.transcript?.content,
          courseTitle: video.course?.title,
          courseCategory: video.course?.category
        })
      })

      if (response.ok) {
        const data = await response.json()
        setStudyNotes(data.notes)
      }
    } catch (error) {
      console.error('Failed to generate study notes:', error)
      generateFallbackNotes()
    } finally {
      setIsNotesLoading(false)
    }
  }

  const generateFallbackNotes = () => {
    const category = video?.course?.category || 'General'
    const fallbackNotes: StudyNote = {
      id: Date.now().toString(),
      title: `Study Notes: ${video?.title}`,
      content: `# ${video?.title}\n\n## Overview\nThis lesson covers important concepts in ${category}.\n\n## Key Points\n- Understand fundamental concepts\n- Apply practical techniques\n- Follow best practices\n- Build practical skills\n\n## Summary\nThis lesson provides essential knowledge for advancing in ${category}.`,
      keyPoints: [
        "Master the fundamental concepts presented",
        "Apply the techniques in practical scenarios", 
        "Follow industry best practices",
        "Build hands-on experience",
        "Connect to broader learning goals"
      ],
      summary: `This lesson on "${video?.title}" covers essential ${category} concepts with practical applications.`,
      difficulty: "Intermediate",
      estimatedTime: "15-20 minutes",
      tags: [category, "Fundamentals", "Practice"],
      createdAt: new Date().toISOString()
    }
    setStudyNotes(fallbackNotes)
  }

  const downloadNotes = () => {
    if (!studyNotes) return

    const notesText = `${studyNotes.title}\n\n${studyNotes.content}\n\nKey Points:\n${studyNotes.keyPoints.map(point => `• ${point}`).join('\n')}\n\nSummary:\n${studyNotes.summary}`
    
    const blob = new Blob([notesText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${video?.title}-notes.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Learning Assistant</h2>
        <p className="text-gray-600">Enhanced learning with AI-powered Q&A, personalized learning paths, and study notes</p>
      </div>

      {/* Main AI Features Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 1. AI Q&A Chat - Can answer ANY questions */}
        <Card className="lg:col-span-1 border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center text-blue-900">
              <MessageSquare className="w-6 h-6 mr-2" />
              AI Q&A Assistant
            </CardTitle>
            <p className="text-sm text-blue-700">Ask me anything - lesson questions, general knowledge, explanations, and more!</p>
          </CardHeader>
          <CardContent className="p-0">
            {/* Chat Messages */}
            <div className="h-80 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="mb-4">Ask me anything!</p>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUserQuery("Explain the main concepts from this lesson")
                        setTimeout(() => handleAIQuestion(), 100)
                      }}
                      className="w-full text-xs"
                    >
                      Explain lesson concepts
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUserQuery("What is artificial intelligence?")
                        setTimeout(() => handleAIQuestion(), 100)
                      }}
                      className="w-full text-xs"
                    >
                      What is AI?
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUserQuery("Give me study tips for this subject")
                        setTimeout(() => handleAIQuestion(), 100)
                      }}
                      className="w-full text-xs"
                    >
                      Study tips
                    </Button>
                  </div>
                </div>
              ) : (
                chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.type === 'ai' && <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                        {message.type === 'user' && <User className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1">
                          {message.isLoading ? (
                            <div className="flex items-center space-x-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Thinking...</span>
                            </div>
                          ) : (
                            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                          )}
                          <div className="text-xs mt-1 opacity-70">
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Ask me anything..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isAILoading && handleAIQuestion()}
                  className="flex-1"
                />
                <Button
                  onClick={handleAIQuestion}
                  disabled={!userQuery.trim() || isAILoading}
                  size="sm"
                >
                  {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Powered by Gemini AI - Ask about this lesson, general knowledge, or anything else!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Learning Journey Map - Field-specific roadmaps */}
        <Card className="lg:col-span-1 border-2 border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center text-green-900">
              <MapPin className="w-6 h-6 mr-2" />
              Learning Journey Map
            </CardTitle>
            <p className="text-sm text-green-700">Your personalized roadmap for mastering {video?.course?.category || 'this field'}</p>
          </CardHeader>
          <CardContent className="p-4">
            {isPathLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">Generating your learning path...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {learningPath.slice(0, 4).map((step, index) => (
                  <div key={step.id} className="relative">
                    <div className={`flex items-start space-x-3 p-3 rounded-lg border-2 ${
                      step.status === 'completed' ? 'bg-green-50 border-green-200' :
                      step.status === 'current' ? 'bg-blue-50 border-blue-200' :
                      'bg-gray-50 border-gray-200'
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        step.status === 'completed' ? 'bg-green-600 text-white' :
                        step.status === 'current' ? 'bg-blue-600 text-white' :
                        'bg-gray-400 text-white'
                      }`}>
                        {step.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : step.id}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{step.title}</h4>
                        <p className="text-xs text-gray-600 mb-2">{step.description}</p>
                        <div className="flex items-center space-x-2 text-xs">
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {step.difficulty}
                          </Badge>
                          <span className="text-gray-500">{step.estimatedTime}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {step.skills.slice(0, 2).map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-xs px-1 py-0">
                              {skill}
                            </Badge>
                          ))}
                          {step.skills.length > 2 && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              +{step.skills.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {index < learningPath.slice(0, 4).length - 1 && (
                      <div className="absolute left-6 top-14 w-0.5 h-4 bg-gray-300"></div>
                    )}
                  </div>
                ))}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateLearningPath}
                    disabled={isPathLoading}
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Journey
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. AI Study Notes - Video-specific notes */}
        <Card className="lg:col-span-1 border-2 border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
            <CardTitle className="flex items-center text-purple-900">
              <FileText className="w-6 h-6 mr-2" />
              AI Study Notes
            </CardTitle>
            <p className="text-sm text-purple-700">Comprehensive notes generated specifically for "{video?.title}"</p>
          </CardHeader>
          <CardContent className="p-4">
            {isNotesLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">Generating study notes...</p>
              </div>
            ) : studyNotes ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">{studyNotes.title}</h4>
                  <div className="text-xs text-gray-600 mb-3 flex items-center space-x-4">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {studyNotes.estimatedTime}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {studyNotes.difficulty}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-sm mb-2">Key Points:</h5>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {studyNotes.keyPoints.map((point, index) => (
                      <div key={index} className="flex items-start space-x-2 text-xs">
                        <Lightbulb className="w-3 h-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                        <span className="text-gray-700">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-sm mb-2">Summary:</h5>
                  <p className="text-xs text-gray-700 leading-relaxed">{studyNotes.summary}</p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {studyNotes.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs px-1 py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadNotes}
                    className="flex-1"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateStudyNotes}
                    disabled={isNotesLoading}
                    className="flex-1"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regenerate
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500 mb-4">No study notes available</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateStudyNotes}
                  disabled={isNotesLoading}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Notes
                </Button>
                {!video?.transcript?.content && (
                  <p className="text-xs text-gray-400 mt-2">
                    Note: Transcript needed for best results
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Buttons */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Quick AI Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-center space-y-2"
              onClick={() => {
                setUserQuery("Summarize this lesson")
                setTimeout(() => handleAIQuestion(), 100)
              }}
              disabled={isAILoading}
            >
              <FileText className="w-6 h-6 text-blue-600" />
              <span className="text-sm">Summarize</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-center space-y-2"
              onClick={() => {
                setUserQuery("Explain the key concepts")
                setTimeout(() => handleAIQuestion(), 100)
              }}
              disabled={isAILoading}
            >
              <Lightbulb className="w-6 h-6 text-yellow-600" />
              <span className="text-sm">Explain</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-center space-y-2"
              onClick={() => {
                setUserQuery("Create practice questions")
                setTimeout(() => handleAIQuestion(), 100)
              }}
              disabled={isAILoading}
            >
              <Target className="w-6 h-6 text-green-600" />
              <span className="text-sm">Practice</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-center space-y-2"
              onClick={() => {
                setUserQuery("Give me study tips")
                setTimeout(() => handleAIQuestion(), 100)
              }}
              disabled={isAILoading}
            >
              <BookOpen className="w-6 h-6 text-purple-600" />
              <span className="text-sm">Study Tips</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Summary */}
      <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Learning Progress</h3>
              <p className="text-gray-600">Track your AI-enhanced learning journey</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{getProgressPercentage()}%</div>
              <div className="text-sm text-gray-500">Complete</div>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg border">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <div className="text-sm font-medium">AI Interactions</div>
              <div className="text-lg font-bold text-gray-900">{chatMessages.length}</div>
            </div>
            
            <div className="text-center p-4 bg-white rounded-lg border">
              <MapPin className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <div className="text-sm font-medium">Learning Steps</div>
              <div className="text-lg font-bold text-gray-900">{learningPath.length}</div>
            </div>
            
            <div className="text-center p-4 bg-white rounded-lg border">
              <FileText className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <div className="text-sm font-medium">Study Notes</div>
              <div className="text-lg font-bold text-gray-900">{studyNotes ? '1' : '0'}</div>
            </div>
            
            <div className="text-center p-4 bg-white rounded-lg border">
              <Award className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
              <div className="text-sm font-medium">AI Features</div>
              <div className="text-lg font-bold text-gray-900">Active</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}