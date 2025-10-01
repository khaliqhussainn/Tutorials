"use client"
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MessageSquare,
  MapPin,
  FileText,
  Send,
  Loader2,
  Bot,
  User,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  Lightbulb,
  TrendingUp,
  Award,
  AlertCircle,
  Sparkles,
  HelpCircle,
  Zap,
  Star,
  ExternalLink,
  Target,
  PlayCircle
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
  resources: string[]
  projects: string[]
  certifications: string[]
  milestones: string[]
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
  practicalExamples: string[]
  commonMistakes: string[]
  nextSteps: string[]
}

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correct: number
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
}

interface LearningJourney {
  title: string
  description: string
  totalDuration: string
  steps: LearningPathStep[]
  careerOutcomes?: string[]
  salaryRange?: string
  industryDemand?: string
  careerProgression?: any[]
  marketInsights?: string
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
  const [learningJourney, setLearningJourney] = useState<LearningJourney | null>(null)
  const [isPathLoading, setIsPathLoading] = useState(false)

  // Study Notes State
  const [studyNotes, setStudyNotes] = useState<StudyNote | null>(null)
  const [isNotesLoading, setIsNotesLoading] = useState(false)

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [isQuizLoading, setIsQuizLoading] = useState(false)
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<number[]>([])
  const [showQuizResults, setShowQuizResults] = useState(false)
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizGenerationCount, setQuizGenerationCount] = useState(0)
  const [remainingGenerations, setRemainingGenerations] = useState(2)

  // UI State
  const [activeTab, setActiveTab] = useState('chat')
  
  // Check if OpenAI is available
  const hasOpenAI = process.env.NEXT_PUBLIC_HAS_OPENAI_KEY === 'true'

  // Initialize features when video changes
  useEffect(() => {
    if (video && hasOpenAI) {
      generateLearningPath()
      generateStudyNotes()
    }
  }, [video, hasOpenAI])

  // 1. AI Q&A Feature
  const handleAIQuestion = async () => {
    if (!userQuery.trim() || !video || !hasOpenAI || isAILoading) return

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
    const currentQuery = userQuery
    setUserQuery('')

    try {
      const response = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: currentQuery,
          videoId: video.id,
          videoTitle: video.title,
          transcript: video.transcript?.content,
          courseTitle: video.course?.title,
          courseCategory: video.course?.category,
          type: 'question',
          context: chatMessages.slice(-3).map(msg => ({
            type: msg.type,
            content: msg.content
          }))
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        const aiMessage: ChatMessage = {
          id: Date.now() + '-ai',
          type: 'ai',
          content: data.content || 'I apologize, but I couldn\'t generate a response.',
          timestamp: new Date()
        }

        setChatMessages(prev => 
          prev.filter(msg => !msg.isLoading).concat([userMessage, aiMessage])
        )
      } else {
        throw new Error('Failed to get AI response')
      }
    } catch (error) {
      console.error('AI question error:', error)
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

  // 2. Learning Journey Generator
  const generateLearningPath = async () => {
    if (!video || !hasOpenAI) return

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
          currentProgress: getProgressPercentage(),
          careerGoals: 'Professional mastery',
          timeCommitment: 'part-time'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setLearningJourney(data)
      }
    } catch (error) {
      console.error('Failed to generate learning path:', error)
    } finally {
      setIsPathLoading(false)
    }
  }

  // 3. AI Study Notes Generator
  const generateStudyNotes = async () => {
    if (!video || !hasOpenAI) return

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
    } finally {
      setIsNotesLoading(false)
    }
  }

  // 4. AI Quiz Generator with limits
  const generateQuiz = async () => {
    if (!video || !hasOpenAI || remainingGenerations <= 0) return

    setIsQuizLoading(true)
    try {
      const response = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          videoTitle: video.title,
          transcript: video.transcript?.content,
          courseTitle: video.course?.title,
          courseCategory: video.course?.category,
          difficulty: 'mixed',
          questionCount: 5,
          regenerateAttempt: quizGenerationCount
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.error) {
          return
        }
        
        setQuizQuestions(data.questions || [])
        setQuizAnswers(new Array(data.questions?.length || 0).fill(-1))
        setCurrentQuizIndex(0)
        setShowQuizResults(false)
        setQuizStarted(true)
        setActiveTab('quiz')
        
        if (data.generationCount !== undefined) {
          setQuizGenerationCount(data.generationCount)
          setRemainingGenerations(data.remainingGenerations || 0)
        }
      }
    } catch (error) {
      console.error('Failed to generate quiz:', error)
    } finally {
      setIsQuizLoading(false)
    }
  }

  const handleQuizAnswer = (answerIndex: number) => {
    const newAnswers = [...quizAnswers]
    newAnswers[currentQuizIndex] = answerIndex
    setQuizAnswers(newAnswers)
  }

  const nextQuizQuestion = () => {
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1)
    } else {
      calculateQuizResults()
    }
  }

  const previousQuizQuestion = () => {
    if (currentQuizIndex > 0) {
      setCurrentQuizIndex(currentQuizIndex - 1)
    }
  }

  const calculateQuizResults = () => {
    setShowQuizResults(true)
  }

  const getQuizScore = () => {
    const correct = quizAnswers.filter((answer, index) => 
      answer === quizQuestions[index]?.correct
    ).length
    return {
      correct,
      total: quizQuestions.length,
      percentage: Math.round((correct / quizQuestions.length) * 100)
    }
  }

  const resetQuiz = () => {
    setQuizQuestions([])
    setQuizAnswers([])
    setCurrentQuizIndex(0)
    setShowQuizResults(false)
    setQuizStarted(false)
  }

  const downloadNotes = () => {
    if (!studyNotes) return

    const notesText = `${studyNotes.title}\n\n${studyNotes.content}\n\nKey Points:\n${studyNotes.keyPoints.map(point => `• ${point}`).join('\n')}\n\nPractical Examples:\n${studyNotes.practicalExamples?.map(example => `• ${example}`).join('\n') || ''}\n\nCommon Mistakes:\n${studyNotes.commonMistakes?.map(mistake => `• ${mistake}`).join('\n') || ''}\n\nNext Steps:\n${studyNotes.nextSteps?.map(step => `• ${step}`).join('\n') || ''}\n\nSummary:\n${studyNotes.summary}\n\nTags: ${studyNotes.tags.join(', ')}`
    
    const blob = new Blob([notesText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${video?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-comprehensive-notes.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!hasOpenAI) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="border border-gray-200">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Features Unavailable</h3>
            <p className="text-gray-600 mb-6">
              OpenAI integration is not configured. To enable AI-powered learning features, please add your OpenAI API key to the environment variables.
            </p>
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <code className="text-sm text-gray-800">OPENAI_API_KEY=your_api_key_here</code>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-[#001E62] mb-2">AI Learning Assistant</h2>
        <p className="text-gray-600 mb-4">Advanced AI-powered tools to enhance your learning experience</p>
        {video && (
          <div className="p-4 bg-[#001E62]/5 rounded-lg border border-[#001E62]/20">
            <h3 className="font-semibold text-[#001E62]">{video.title}</h3>
            <p className="text-sm text-gray-600">{video.course?.title} • {video.course?.category}</p>
          </div>
        )}
      </div>

      {/* AI Features Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8 bg-gray-100">
          <TabsTrigger value="chat" className="flex items-center gap-2 data-[state=active]:bg-[#001E62] data-[state=active]:text-white">
            <MessageSquare className="w-4 h-4" />
            AI Tutor
          </TabsTrigger>
          <TabsTrigger value="journey" className="flex items-center gap-2 data-[state=active]:bg-[#001E62] data-[state=active]:text-white">
            <MapPin className="w-4 h-4" />
            Career Path
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2 data-[state=active]:bg-[#001E62] data-[state=active]:text-white">
            <FileText className="w-4 h-4" />
            Study Notes
          </TabsTrigger>
          <TabsTrigger value="quiz" className="flex items-center gap-2 data-[state=active]:bg-[#001E62] data-[state=active]:text-white">
            <HelpCircle className="w-4 h-4" />
            Smart Quiz
          </TabsTrigger>
        </TabsList>

        {/* AI Q&A Chat Tab */}
        <TabsContent value="chat" className="mt-6">
          <Card className="border border-[#001E62]/20">
            <CardHeader className="bg-[#001E62]/5 border-b border-[#001E62]/10">
              <CardTitle className="flex items-center text-[#001E62]">
                <MessageSquare className="w-6 h-6 mr-2" />
                AI Tutor - Ask Anything
              </CardTitle>
              <p className="text-sm text-gray-600">Get expert explanations, clarifications, and guidance on any topic</p>
            </CardHeader>
            <CardContent className="p-0">
              {/* Chat Messages */}
              <div className="h-96 overflow-y-auto p-6 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Bot className="w-12 h-12 mx-auto mb-4 text-[#001E62]/40" />
                    <p className="text-lg font-medium mb-2 text-gray-700">Your AI Learning Assistant</p>
                    <p className="mb-6 text-gray-600">Ask questions, get explanations, or discuss concepts from this lesson</p>
                    <div className="grid grid-cols-1 gap-2 max-w-lg mx-auto">
                      {[
                        "Explain the key concepts in simple terms",
                        "What are the practical applications?",
                        "How does this connect to other topics?",
                        "What should I focus on learning next?"
                      ].map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => setUserQuery(suggestion)}
                          className="text-sm text-left justify-start border-[#001E62]/20 hover:bg-[#001E62]/5"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-4 rounded-lg ${
                          message.type === 'user'
                            ? 'bg-[#001E62] text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-900 rounded-bl-none'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {message.type === 'ai' && <Bot className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#001E62]" />}
                          {message.type === 'user' && <User className="w-5 h-5 mt-0.5 flex-shrink-0" />}
                          <div className="flex-1">
                            {message.isLoading ? (
                              <div className="flex items-center space-x-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Thinking...</span>
                              </div>
                            ) : (
                              <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                            )}
                            <div className="text-xs mt-2 opacity-70">
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
              <div className="border-t border-[#001E62]/10 p-4">
                <div className="flex space-x-3">
                  <Input
                    placeholder="Ask your question..."
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isAILoading && handleAIQuestion()}
                    className="flex-1 border-[#001E62]/20 focus:border-[#001E62]"
                  />
                  <Button
                    onClick={handleAIQuestion}
                    disabled={!userQuery.trim() || isAILoading}
                    size="lg"
                    className="bg-[#001E62] hover:bg-[#001E62]/90"
                  >
                    {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learning Journey Tab */}
       <TabsContent value="journey" className="mt-6">
  <Card className="border border-[#001E62]/20">
    <CardHeader className="bg-[#001E62]/5 border-b border-[#001E62]/10">
      <CardTitle className="flex items-center text-[#001E62]">
        <MapPin className="w-6 h-6 mr-2" />
        Learning Roadmap
      </CardTitle>
      <p className="text-sm text-gray-600">
        Your personalized learning path for {video?.course?.category || 'this course'}
      </p>
    </CardHeader>
    <CardContent className="p-6">
      {isPathLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#001E62]" />
          <p className="text-gray-500">Creating your personalized roadmap...</p>
        </div>
      ) : learningJourney ? (
        <div className="space-y-6">
          {/* Journey Overview */}
          <div className="bg-[#001E62]/5 p-6 rounded-lg border border-[#001E62]/10">
            <h3 className="text-2xl font-bold text-[#001E62] mb-2">
              {learningJourney.title}
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {learningJourney.description}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Your Progress</span>
              <span className="text-sm text-gray-600">
                Phase 1 of {learningJourney.steps?.length || 0}
              </span>
            </div>
            <Progress 
              value={(1 / (learningJourney.steps?.length || 1)) * 100} 
              className="h-2" 
            />
          </div>

          {/* Learning Steps */}
          <div className="space-y-4">
            {learningJourney.steps?.map((step, index) => (
              <Card 
                key={step.id} 
                className={`border-l-4 ${
                  index === 0 
                    ? 'border-l-[#001E62] bg-[#001E62]/5' 
                    : 'border-l-gray-300'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                          index === 0 
                            ? 'bg-[#001E62] text-white' 
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <Badge 
                          variant="outline" 
                          className="text-xs border-[#001E62]/30"
                        >
                          {step.difficulty}
                        </Badge>
                        {index === 0 && (
                          <Badge className="bg-[#001E62] text-xs">
                            <PlayCircle className="w-3 h-3 mr-1" />
                            Current
                          </Badge>
                        )}
                      </div>

                      <CardTitle className="text-lg text-[#001E62] mb-2">
                        {step.title}
                      </CardTitle>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                {step.skills && step.skills.length > 0 && (
                  <CardContent>
                    <div className="font-semibold text-sm text-gray-800 mb-2 flex items-center">
                      <Sparkles className="w-4 h-4 mr-1.5 text-[#001E62]" />
                      Key Skills
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {step.skills.map((skill, idx) => (
                        <Badge 
                          key={idx} 
                          variant="outline" 
                          className="text-xs border-[#001E62]/30 text-[#001E62]"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={generateLearningPath}
              disabled={isPathLoading}
              className="flex-1 border-[#001E62]/30 hover:bg-[#001E62]/5"
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Roadmap
            </Button>
            <Button
              onClick={() => {
                const pathText = `${learningJourney.title}\n\n${learningJourney.description}\n\nLearning Path:\n\n${learningJourney.steps?.map((s, i) => `${i + 1}. ${s.title} (${s.difficulty})\n   ${s.description}\n   Skills: ${s.skills?.join(', ')}\n`).join('\n')}`
                const blob = new Blob([pathText], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `learning-roadmap-${video?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="flex-1 bg-[#001E62] hover:bg-[#001E62]/90"
              size="lg"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Roadmap
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-[#001E62]/40" />
          <h3 className="text-xl font-semibold text-[#001E62] mb-2">
            Generate Your Learning Roadmap
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Create a personalized learning path based on this course
          </p>
          <Button
            onClick={generateLearningPath}
            disabled={isPathLoading || !video}
            size="lg"
            className="bg-[#001E62] hover:bg-[#001E62]/90"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Roadmap
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>

        {/* Study Notes Tab */}
        <TabsContent value="notes" className="mt-6">
          <Card className="border border-[#001E62]/20">
            <CardHeader className="bg-[#001E62]/5 border-b border-[#001E62]/10">
              <CardTitle className="flex items-center text-[#001E62]">
                <FileText className="w-6 h-6 mr-2" />
                Comprehensive Study Notes
              </CardTitle>
              <p className="text-sm text-gray-600">Detailed notes with examples, insights, and actionable next steps</p>
            </CardHeader>
            <CardContent className="p-6">
              {isNotesLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#001E62]" />
                  <p className="text-gray-500">Generating comprehensive study notes...</p>
                </div>
              ) : studyNotes ? (
                <div className="space-y-6">
                  {/* Metadata */}
                  <div className="flex flex-wrap gap-3 text-sm">
                    <Badge variant="outline" className="border-[#001E62]/30">{studyNotes.difficulty}</Badge>
                    <Badge variant="outline" className="border-[#001E62]/30">
                      <Clock className="w-3 h-3 mr-1" />
                      {studyNotes.estimatedTime}
                    </Badge>
                    {studyNotes.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="border-[#001E62]/30">{tag}</Badge>
                    ))}
                  </div>

                  {/* Content */}
                  <div className="bg-white p-6 rounded border border-gray-200">
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                      <div className="whitespace-pre-wrap">{studyNotes.content}</div>
                    </div>
                  </div>

                  {/* Key Points */}
                  <div className="bg-[#001E62]/5 p-6 rounded border border-[#001E62]/10">
                    <h4 className="font-semibold text-[#001E62] mb-4 flex items-center">
                      <Lightbulb className="w-5 h-5 mr-2" />
                      Key Points to Master
                    </h4>
                    <div className="space-y-3">
                      {studyNotes.keyPoints.map((point, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <Star className="w-4 h-4 mt-0.5 text-[#001E62] flex-shrink-0" />
                          <span className="text-sm text-gray-700">{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Practical Examples */}
                  {studyNotes.practicalExamples && studyNotes.practicalExamples.length > 0 && (
                    <div className="bg-gray-50 p-6 rounded border border-gray-200">
                      <h4 className="font-semibold text-[#001E62] mb-4">Practical Examples</h4>
                      <div className="space-y-3">
                        {studyNotes.practicalExamples.map((example, index) => (
                          <div key={index} className="flex items-start space-x-3">
                            <ExternalLink className="w-4 h-4 mt-0.5 text-[#001E62] flex-shrink-0" />
                            <span className="text-sm text-gray-700">{example}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Common Mistakes */}
                  {studyNotes.commonMistakes && studyNotes.commonMistakes.length > 0 && (
                    <div className="bg-gray-50 p-6 rounded border border-gray-200">
                      <h4 className="font-semibold text-[#001E62] mb-4">Common Mistakes to Avoid</h4>
                      <div className="space-y-3">
                        {studyNotes.commonMistakes.map((mistake, index) => (
                          <div key={index} className="flex items-start space-x-3">
                            <AlertCircle className="w-4 h-4 mt-0.5 text-[#001E62] flex-shrink-0" />
                            <span className="text-sm text-gray-700">{mistake}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next Steps */}
                  {studyNotes.nextSteps && studyNotes.nextSteps.length > 0 && (
                    <div className="bg-[#001E62]/5 p-6 rounded border border-[#001E62]/10">
                      <h4 className="font-semibold text-[#001E62] mb-4">Next Steps for Learning</h4>
                      <div className="space-y-3">
                        {studyNotes.nextSteps.map((step, index) => (
                          <div key={index} className="flex items-start space-x-3">
                            <CheckCircle className="w-4 h-4 mt-0.5 text-[#001E62] flex-shrink-0" />
                            <span className="text-sm text-gray-700">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="bg-gray-50 p-6 rounded border border-gray-200">
                    <h4 className="font-semibold text-[#001E62] mb-3">Summary</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">{studyNotes.summary}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3">
                    <Button
                      onClick={downloadNotes}
                      className="flex-1 bg-[#001E62] hover:bg-[#001E62]/90"
                      size="lg"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Notes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={generateStudyNotes}
                      disabled={isNotesLoading}
                      className="flex-1 border-[#001E62]/30 hover:bg-[#001E62]/5"
                      size="lg"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-[#001E62]/40" />
                  <h3 className="text-xl font-semibold text-[#001E62] mb-2">Generate Study Notes</h3>
                  <p className="text-gray-600 mb-6">Create comprehensive notes with examples and insights</p>
                  <Button
                    onClick={generateStudyNotes}
                    disabled={isNotesLoading || !video}
                    size="lg"
                    className="bg-[#001E62] hover:bg-[#001E62]/90"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Notes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smart Quiz Tab */}
        <TabsContent value="quiz" className="mt-6">
          <Card className="border border-[#001E62]/20">
            <CardHeader className="bg-[#001E62]/5 border-b border-[#001E62]/10">
              <CardTitle className="flex items-center text-[#001E62]">
                <HelpCircle className="w-6 h-6 mr-2" />
                Advanced Practice Quiz
              </CardTitle>
              <p className="text-sm text-gray-600">
                Test your understanding with challenging questions
                {remainingGenerations > 0 && (
                  <span className="ml-2 text-xs bg-[#001E62]/10 text-[#001E62] px-2 py-1 rounded">
                    {remainingGenerations} remaining
                  </span>
                )}
              </p>
            </CardHeader>
            <CardContent className="p-6">
              {isQuizLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#001E62]" />
                  <p className="text-gray-500">Creating quiz questions...</p>
                </div>
              ) : quizQuestions.length > 0 && !showQuizResults ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Question {currentQuizIndex + 1} of {quizQuestions.length}
                    </span>
                    <Badge variant="outline" className="border-[#001E62]/30">
                      {quizQuestions[currentQuizIndex]?.difficulty} • {quizQuestions[currentQuizIndex]?.points} pts
                    </Badge>
                  </div>
                  
                  <Progress value={((currentQuizIndex + 1) / quizQuestions.length) * 100} className="h-2" />
                  
                  <div className="bg-white p-6 rounded border border-gray-200">
                    <h4 className="font-semibold text-lg mb-6 text-gray-900 leading-relaxed">
                      {quizQuestions[currentQuizIndex]?.question}
                    </h4>
                    
                    <div className="space-y-3">
                      {quizQuestions[currentQuizIndex]?.options.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuizAnswer(index)}
                          className={`w-full p-4 text-left rounded border-2 transition-all ${
                            quizAnswers[currentQuizIndex] === index
                              ? 'bg-[#001E62]/5 border-[#001E62] text-gray-900'
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start">
                            <span className="font-semibold mr-3 text-sm text-[#001E62]">
                              {String.fromCharCode(65 + index)}.
                            </span>
                            <span className="text-sm leading-relaxed">{option}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={previousQuizQuestion}
                      disabled={currentQuizIndex === 0}
                      className="border-[#001E62]/30"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={nextQuizQuestion}
                      disabled={quizAnswers[currentQuizIndex] === -1}
                      size="lg"
                      className="bg-[#001E62] hover:bg-[#001E62]/90"
                    >
                      {currentQuizIndex === quizQuestions.length - 1 ? 'Complete Quiz' : 'Next Question'}
                    </Button>
                  </div>
                </div>
              ) : showQuizResults ? (
                <div className="text-center py-8">
                  <div className="bg-white p-8 rounded border border-gray-200 mb-6">
                    <h3 className="text-2xl font-bold text-[#001E62] mb-4">Quiz Completed!</h3>
                    <div className="text-5xl font-bold text-[#001E62] mb-3">
                      {getQuizScore().percentage}%
                    </div>
                    <div className="text-gray-600 mb-6">
                      {getQuizScore().correct} out of {getQuizScore().total} questions correct
                    </div>
                    
                    <div className="text-sm text-gray-700 p-4 bg-gray-50 rounded">
                      {getQuizScore().percentage >= 80 ? 
                        "Outstanding! You demonstrate strong mastery of the concepts." :
                        getQuizScore().percentage >= 60 ?
                        "Good progress! Review the concepts and try again." :
                        "Keep learning! Focus on understanding the core concepts."}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {remainingGenerations > 0 && (
                      <Button
                        onClick={generateQuiz}
                        className="w-full bg-[#001E62] hover:bg-[#001E62]/90"
                        size="lg"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Generate New Quiz ({remainingGenerations} remaining)
                      </Button>
                    )}
                    
                    {remainingGenerations === 0 && (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded">
                        <p className="text-sm text-gray-700">
                          You've reached the quiz generation limit for this video.
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowQuizResults(false)
                          setCurrentQuizIndex(0)
                        }}
                        className="border-[#001E62]/30"
                      >
                        Review Answers
                      </Button>
                      <Button
                        variant="outline"
                        onClick={resetQuiz}
                        className="border-[#001E62]/30"
                      >
                        Reset Quiz
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <HelpCircle className="w-16 h-16 mx-auto mb-4 text-[#001E62]/40" />
                  <h3 className="text-xl font-semibold text-[#001E62] mb-2">Generate Practice Quiz</h3>
                  <p className="text-gray-600 mb-6">
                    Test your understanding with challenging questions
                  </p>
                  <Button
                    onClick={generateQuiz}
                    disabled={isQuizLoading || remainingGenerations === 0}
                    size="lg"
                    className="bg-[#001E62] hover:bg-[#001E62]/90"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    {remainingGenerations === 0 ? 'Limit Reached' : 'Generate Quiz'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}