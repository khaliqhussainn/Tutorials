import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
// import { Textarea } from "@/components/ui/Textarea"
import {
  Brain,
  StickyNote,
  Award,
  Download,
  Clock,
  Bot,
  BookOpen,
  Target,
  Lightbulb,
  MessageSquare,
  FileText,
  TrendingUp,
  Zap,
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Play,
  PenTool,
  Sparkles,
  BarChart3,
  Book,
  HelpCircle,
  Loader2,
  Send,
  X,
  ChevronRight,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from "lucide-react"

interface Video {
  id: string
  title: string
  description?: string
  tests: any[]
  transcript?: {
    content: string
    status: string
    segments?: any[]
  }
}

interface LearningToolsTabProps {
  video: Video | null
  getProgressPercentage: () => number
  setActiveTab: (tab: any) => void
}

interface AIResponse {
  type: 'summary' | 'explanation' | 'quiz' | 'notes' | 'concepts'
  content: string
  confidence: number
  sources?: string[]
}

interface StudyNote {
  id: string
  content: string
  timestamp: number
  aiGenerated: boolean
  tags: string[]
  createdAt: string
}

interface ConceptMap {
  concept: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  connections: string[]
}

export function LearningToolsTab({
  video,
  getProgressPercentage,
  setActiveTab,
}: LearningToolsTabProps) {
  const [activeAITool, setActiveAITool] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [userQuery, setUserQuery] = useState('')
  const [studyNotes, setStudyNotes] = useState<StudyNote[]>([])
  const [conceptMap, setConceptMap] = useState<ConceptMap[]>([])
  const [studyGoals, setStudyGoals] = useState<string[]>([])
  const [learningPath, setLearningPath] = useState<any[]>([])
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [quizResults, setQuizResults] = useState<any>(null)

  // AI Chat State
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string
    type: 'user' | 'ai'
    content: string
    timestamp: Date
  }>>([])

  useEffect(() => {
    if (video) {
      generateConceptMap()
      generateLearningPath()
    }
  }, [video])

  const generateConceptMap = async () => {
    if (!video?.transcript?.content) return

    setAiLoading(true)
    try {
      const response = await fetch('/api/ai/analyze-concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          transcript: video.transcript.content,
          title: video.title
        })
      })

      if (response.ok) {
        const data = await response.json()
        setConceptMap(data.concepts || [])
      }
    } catch (error) {
      console.error('Failed to generate concept map:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const generateLearningPath = async () => {
    if (!video) return

    try {
      const response = await fetch('/api/ai/learning-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          userProgress: getProgressPercentage(),
          hasQuiz: video.tests?.length > 0
        })
      })

      if (response.ok) {
        const data = await response.json()
        setLearningPath(data.path || [])
      }
    } catch (error) {
      console.error('Failed to generate learning path:', error)
    }
  }

  const handleAIQuery = async (query: string, type: string) => {
    if (!query.trim() || !video) return

    setAiLoading(true)
    setActiveAITool(type)

    try {
      const response = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          videoId: video.id,
          videoTitle: video.title,
          transcript: video.transcript?.content,
          type,
          context: chatMessages.slice(-3) // Include recent context
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAiResponse(data)

        // Add to chat history
        const userMessage = {
          id: Date.now() + '-user',
          type: 'user' as const,
          content: query,
          timestamp: new Date()
        }

        const aiMessage = {
          id: Date.now() + '-ai',
          type: 'ai' as const,
          content: data.content,
          timestamp: new Date()
        }

        setChatMessages(prev => [...prev, userMessage, aiMessage])

        // Text-to-speech if enabled
        if (isVoiceMode && data.content) {
          speakText(data.content)
        }
      }
    } catch (error) {
      console.error('AI query failed:', error)
    } finally {
      setAiLoading(false)
      setUserQuery('')
    }
  }

  const generateAINotes = async () => {
    if (!video?.transcript?.content) return

    setAiLoading(true)
    try {
      const response = await fetch('/api/ai/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          transcript: video.transcript.content,
          title: video.title
        })
      })

      if (response.ok) {
        const data = await response.json()
        const newNote: StudyNote = {
          id: Date.now().toString(),
          content: data.notes,
          timestamp: 0,
          aiGenerated: true,
          tags: data.tags || [],
          createdAt: new Date().toISOString()
        }
        setStudyNotes(prev => [newNote, ...prev])
      }
    } catch (error) {
      console.error('Failed to generate AI notes:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const generatePersonalizedQuiz = async () => {
    if (!video) return

    setAiLoading(true)
    try {
      const response = await fetch(`/api/admin/videos/${video.id}/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regenerate: true,
          personalized: true,
          difficulty: 'adaptive',
          focusAreas: studyGoals
        })
      })

      if (response.ok) {
        const data = await response.json()
        setQuizResults(data)
      }
    } catch (error) {
      console.error('Failed to generate personalized quiz:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.8
    utterance.pitch = 1
    utterance.volume = 0.8

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)

    speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser')
      return
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setIsVoiceMode(true)
    recognition.onend = () => setIsVoiceMode(false)

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setUserQuery(transcript)
    }

    recognition.start()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Learning Assistant</h2>
          <p className="text-gray-600">Enhance your learning with AI-powered tools and insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVoiceMode(!isVoiceMode)}
            className={isVoiceMode ? 'bg-blue-50 border-blue-200' : ''}
          >
            {isVoiceMode ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            Voice {isVoiceMode ? 'Off' : 'On'}
          </Button>
          {isSpeaking && (
            <Button variant="outline" size="sm" onClick={stopSpeaking}>
              <X className="w-4 h-4 mr-1" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* AI Chat Interface */}
      <Card className="border-2 border-blue-100">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center text-blue-900">
            <Bot className="w-6 h-6 mr-2" />
            AI Tutor Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Chat Messages */}
          <div className="h-64 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Ask me anything about this lesson!</p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {['Explain key concepts', 'Generate summary', 'Create practice questions', 'Study tips'].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAIQuery(suggestion, 'explanation')}
                      className="text-xs"
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
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="text-sm">{message.content}</div>
                    <div className="text-xs mt-1 opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Ask about this lesson..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAIQuery(userQuery, 'chat')}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={startVoiceRecognition}
                disabled={isVoiceMode}
              >
                {isVoiceMode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button
                onClick={() => handleAIQuery(userQuery, 'chat')}
                disabled={!userQuery.trim() || aiLoading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Concept Map */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Brain className="w-5 h-5 mr-2 text-purple-600" />
              Concept Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm mb-4">
              Visualize key concepts and their relationships
            </p>
            {conceptMap.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {conceptMap.slice(0, 3).map((concept, index) => (
                  <div key={index} className="p-2 bg-purple-50 rounded border-l-4 border-purple-500">
                    <div className="font-medium text-sm">{concept.concept}</div>
                    <div className="text-xs text-gray-600">{concept.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">Generate concept map</p>
              </div>
            )}
            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={generateConceptMap}
              disabled={aiLoading || !video?.transcript?.content}
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
              {conceptMap.length > 0 ? 'Regenerate' : 'Generate'} Map
            </Button>
          </CardContent>
        </Card>

        {/* AI Study Notes */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <PenTool className="w-5 h-5 mr-2 text-green-600" />
              AI Study Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm mb-4">
              Auto-generated notes from lesson content
            </p>
            {studyNotes.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {studyNotes.slice(0, 2).map((note) => (
                  <div key={note.id} className="p-2 bg-green-50 rounded text-sm">
                    <div className="flex items-center mb-1">
                      {note.aiGenerated && <Bot className="w-3 h-3 mr-1 text-green-600" />}
                      <span className="text-xs text-gray-500">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-800 line-clamp-2">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">No notes yet</p>
              </div>
            )}
            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={generateAINotes}
              disabled={aiLoading || !video?.transcript?.content}
            >
              <PenTool className="w-4 h-4 mr-2" />
              Generate Notes
            </Button>
          </CardContent>
        </Card>

        {/* Personalized Quiz */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Target className="w-5 h-5 mr-2 text-blue-600" />
              Smart Quiz
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm mb-4">
              Adaptive quiz based on your learning progress
            </p>
            {quizResults ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Questions Generated:</span>
                  <Badge variant="secondary">{quizResults.count}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Difficulty:</span>
                  <Badge className="bg-blue-100 text-blue-800">Adaptive</Badge>
                </div>
                <div className="text-xs text-gray-500">
                  Generated from: {quizResults.source}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Brain className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">Create personalized quiz</p>
              </div>
            )}
            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={generatePersonalizedQuiz}
              disabled={aiLoading}
            >
              <Target className="w-4 h-4 mr-2" />
              {quizResults ? 'Retake Quiz' : 'Generate Quiz'}
            </Button>
          </CardContent>
        </Card>

        {/* Learning Analytics */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <BarChart3 className="w-5 h-5 mr-2 text-orange-600" />
              Learning Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm mb-4">
              Track your progress and get insights
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Completion</span>
                <div className="flex items-center">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full" 
                      style={{ width: `${getProgressPercentage()}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{getProgressPercentage()}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Quiz Available:</span>
                <Badge variant={video?.tests?.length > 0 ? "default" : "secondary"}>
                  {video?.tests?.length > 0 ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>AI Features:</span>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
            </div>
            <Button className="w-full mt-4" variant="outline">
              <TrendingUp className="w-4 h-4 mr-2" />
              View Detailed Analytics
            </Button>
          </CardContent>
        </Card>

        {/* Learning Path */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <BookOpen className="w-5 h-5 mr-2 text-indigo-600" />
              Learning Path
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm mb-4">
              Personalized next steps for optimal learning
            </p>
            {learningPath.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {learningPath.slice(0, 3).map((step, index) => (
                  <div key={index} className="flex items-center p-2 bg-indigo-50 rounded">
                    <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs mr-2">
                      {index + 1}
                    </div>
                    <span className="text-sm">{step.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">Generating path...</p>
              </div>
            )}
            <Button className="w-full mt-4" variant="outline">
              <ChevronRight className="w-4 h-4 mr-2" />
              View Full Path
            </Button>
          </CardContent>
        </Card>

        {/* Certificate Progress */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Award className="w-5 h-5 mr-2 text-yellow-600" />
              Certificate Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm mb-4">
              Track progress toward earning your certificate
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Video Completion:</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Quiz Completion:</span>
                {video?.tests?.length > 0 ? (
                  <Clock className="w-4 h-4 text-orange-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>AI Engagement:</span>
                <Badge className="bg-blue-100 text-blue-800">Active</Badge>
              </div>
            </div>
            <Button
              className="w-full mt-4"
              disabled={getProgressPercentage() !== 100}
              variant={getProgressPercentage() === 100 ? "primary" : "outline"}
            >
              {getProgressPercentage() === 100 ? (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Certificate
                </>
              ) : (
                <>
                  <Award className="w-4 h-4 mr-2" />
                  {getProgressPercentage()}% Complete
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Quick AI Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-center space-y-2"
              onClick={() => handleAIQuery('Summarize this lesson', 'summary')}
              disabled={aiLoading}
            >
              <FileText className="w-6 h-6 text-blue-600" />
              <span className="text-sm">Summarize</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-center space-y-2"
              onClick={() => handleAIQuery('Explain the key concepts', 'explanation')}
              disabled={aiLoading}
            >
              <Lightbulb className="w-6 h-6 text-yellow-600" />
              <span className="text-sm">Explain</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-center space-y-2"
              onClick={() => handleAIQuery('Create practice questions', 'quiz')}
              disabled={aiLoading}
            >
              <HelpCircle className="w-6 h-6 text-green-600" />
              <span className="text-sm">Practice</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-center space-y-2"
              onClick={() => setActiveTab("notes")}
            >
              <StickyNote className="w-6 h-6 text-purple-600" />
              <span className="text-sm">Notes</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Learning Time (from original) */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Schedule Learning Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Learning a little each day adds up. Research shows that students who make learning a habit are more likely to reach their goals. Set time aside to learn and get reminders using your learning scheduler.
          </p>
          <div className="flex space-x-4">
            <Button className="bg-blue-600 hover:bg-blue-700">
              Get Started
            </Button>
            <Button variant="outline">Dismiss</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}