// app/admin/courses/[courseId]/page.tsx - Complete Integration with Transcript
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import TranscriptManager from '@/components/admin/TranscriptManager'
import { 
  FileText, // Added for transcript functionality
  ArrowLeft, 
  Plus, 
  Play, 
  Edit, 
  Trash2, 
  Upload,
  Clock,
  AlertCircle,
  CheckCircle,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  X,
  RefreshCw,
  Target,
  Brain,
  Settings,
  Eye,
  BarChart3,
  Users,
  TrendingUp,
  Award,
  HelpCircle,
  Lightbulb,
  BookOpen,
  Zap
} from 'lucide-react'

interface Transcript {
  id: string
  videoId: string
  content: string
  language: string
  segments?: any[]
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  error?: string
  generatedAt?: string
  createdAt: string
  updatedAt: string
}

interface CourseSection {
  id: string
  title: string
  description?: string
  order: number
  videos: Video[]
}

interface Course {
  id: string
  title: string
  description: string
  category: string
  level: string
  isPublished: boolean
  thumbnail?: string
  sections: CourseSection[]
  videos: Video[] // Legacy videos without sections
}

interface Video {
  id: string
  title: string
  description?: string
  videoUrl: string
  duration?: number
  order: number
  aiPrompt?: string
  tests: Test[]
  transcript?: Transcript  // Added transcript support
  sectionId?: string
}

interface Test {
  id: string
  question: string
  options: string[]
  correct: number
  explanation?: string
  difficulty: string
  order?: number  // Added order support
}

interface SectionFormData {
  title: string
  description: string
}

interface VideoFormData {
  title: string
  description: string
  aiPrompt: string
  videoFile: File | null
  sectionId: string
  generateTranscript: boolean  // Added transcript generation option
}

interface UploadState {
  uploading: boolean
  progress: number
  stage: 'idle' | 'uploading' | 'processing' | 'generating_transcript' | 'success' | 'error'
  error: string
  retryCount: number
}

interface TestManagementState {
  videoId: string | null
  showDialog: boolean
  regenerating: boolean
  settings: {
    difficulty: 'mixed' | 'easy' | 'medium' | 'hard'
    questionCount: number
    focusAreas: string[]
    avoidTopics: string[]
  }
}

// AI Prompt Suggestions
const AI_PROMPT_SUGGESTIONS = [
  {
    category: "HTML & Web Development",
    examples: [
      "This video covers HTML fundamentals including basic tags (h1-h6, p, div, span), semantic elements (header, nav, main, footer), and document structure. Students will learn how to create well-structured web pages with proper HTML5 syntax.",
      "Introduction to HTML forms: form elements, input types (text, email, password, checkbox, radio), form validation attributes, labels for accessibility, and best practices for creating user-friendly web forms.",
    ],
    tips: [
      "Include specific HTML tags and attributes covered",
      "Mention practical applications and use cases",
      "Note any accessibility or SEO concepts discussed"
    ]
  },
  {
    category: "CSS & Styling",
    examples: [
      "CSS fundamentals: selectors (element, class, ID), properties for text styling (color, font-size, font-family), layout basics with margin and padding, and understanding the CSS box model concept.",
      "Advanced CSS layouts with Flexbox: container and item properties, justify-content, align-items, flex-direction, responsive design patterns, and solving common layout challenges with modern CSS.",
    ],
    tips: [
      "Specify CSS properties and selectors taught",
      "Include layout concepts and responsive design elements",
      "Mention any design principles or best practices"
    ]
  },
  {
    category: "JavaScript & Programming",
    examples: [
      "JavaScript basics: variables (let, const, var), data types (strings, numbers, booleans, arrays, objects), basic operations, and understanding scope and hoisting concepts.",
      "DOM manipulation: selecting elements with querySelector and getElementById, modifying content with innerHTML and textContent, event handling (click, submit, change), and creating interactive web pages.",
    ],
    tips: [
      "List specific JavaScript concepts and syntax covered",
      "Include any DOM methods or APIs used",
      "Mention programming concepts like loops, functions, or conditionals"
    ]
  }
]

export default function CompleteAdminCoursePage({ params }: { params: { courseId: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSectionForm, setShowSectionForm] = useState(false)
  const [showVideoForm, setShowVideoForm] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Transcript management state
  const [showTranscriptManager, setShowTranscriptManager] = useState<string | null>(null)
  
  const [sectionForm, setSectionForm] = useState<SectionFormData>({
    title: '',
    description: ''
  })
  
  const [videoForm, setVideoForm] = useState<VideoFormData>({
    title: '',
    description: '',
    aiPrompt: '',
    videoFile: null,
    sectionId: '',
    generateTranscript: false // Added transcript generation option
  })

  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    stage: 'idle',
    error: '',
    retryCount: 0
  })

  const [testManagement, setTestManagement] = useState<TestManagementState>({
    videoId: null,
    showDialog: false,
    regenerating: false,
    settings: {
      difficulty: 'mixed',
      questionCount: 5,
      focusAreas: [],
      avoidTopics: []
    }
  })

  // AI Helper state
  const [showAIHelper, setShowAIHelper] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [promptQuality, setPromptQuality] = useState<'poor' | 'good' | 'excellent' | null>(null)

  useEffect(() => {
    if (session?.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchCourse()
  }, [session, router, params.courseId])

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/admin/courses/${params.courseId}`)
      if (response.ok) {
        const data = await response.json()
        setCourse(data)
        // Expand all sections by default
        const sectionIds = new Set<string>(data.sections?.map((s: CourseSection) => s.id) || [])
        setExpandedSections(sectionIds)
      } else {
        router.push('/admin/courses')
      }
    } catch (error) {
      console.error('Error fetching course:', error)
      router.push('/admin/courses')
    } finally {
      setLoading(false)
    }
  }

  // Transcript management functions
  const openTranscriptManager = (videoId: string) => {
    setShowTranscriptManager(videoId)
  }

  const closeTranscriptManager = () => {
    setShowTranscriptManager(null)
  }

  const handleSectionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSectionForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/admin/courses/${params.courseId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sectionForm)
      })

      if (!response.ok) {
        throw new Error('Failed to create section')
      }

      setSuccess('Section created successfully!')
      setShowSectionForm(false)
      setSectionForm({ title: '', description: '' })
      await fetchCourse()

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create section')
    }
  }

  const handleVideoFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement
    
    if (type === 'checkbox') {
      setVideoForm(prev => ({ ...prev, [name]: checked }))
    } else {
      setVideoForm(prev => ({ ...prev, [name]: value }))
      
      // Analyze AI prompt quality
      if (name === 'aiPrompt') {
        analyzePromptQuality(value)
      }
    }
  }

  const analyzePromptQuality = (prompt: string) => {
    const length = prompt.trim().length
    const hasSpecificTerms = /\b(html|css|javascript|python|learn|concept|technique|method|function|element|property|tag|selector|variable|array|object)\b/i.test(prompt)
    const hasStructure = prompt.includes(':') || prompt.includes(',') || prompt.includes('.')
    const wordCount = prompt.trim().split(/\s+/).length

    if (length < 20 || wordCount < 10) {
      setPromptQuality('poor')
    } else if (length > 50 && hasSpecificTerms && hasStructure && wordCount > 15) {
      setPromptQuality('excellent')
    } else if (length > 30 && (hasSpecificTerms || hasStructure)) {
      setPromptQuality('good')
    } else {
      setPromptQuality('poor')
    }
  }

  const useExamplePrompt = (example: string) => {
    setVideoForm(prev => ({ ...prev, aiPrompt: example }))
    analyzePromptQuality(example)
    setShowAIHelper(false)
  }

  const getPromptQualityInfo = () => {
    switch (promptQuality) {
      case 'excellent':
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-600" />,
          text: "Excellent prompt! This will generate high-quality, relevant questions.",
          color: "text-green-700 bg-green-50 border-green-200"
        }
      case 'good':
        return {
          icon: <Target className="w-4 h-4 text-blue-600" />,
          text: "Good prompt. Consider adding more specific details for better questions.",
          color: "text-blue-700 bg-blue-50 border-blue-200"
        }
      case 'poor':
        return {
          icon: <AlertCircle className="w-4 h-4 text-orange-600" />,
          text: "Prompt needs improvement. Add more details about the content covered.",
          color: "text-orange-700 bg-orange-50 border-orange-200"
        }
      default:
        return null
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file
      if (file.size > 200 * 1024 * 1024) {
        setUploadState(prev => ({ ...prev, error: 'File size must be less than 200MB' }))
        return
      }
      if (!file.type.startsWith('video/')) {
        setUploadState(prev => ({ ...prev, error: 'Please select a valid video file' }))
        return
      }
      
      setVideoForm(prev => ({ ...prev, videoFile: file }))
      setUploadState(prev => ({ ...prev, error: '' }))
    }
  }

  const uploadWithRetry = async (maxRetries = 3): Promise<any> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setUploadState(prev => ({ ...prev, retryCount: attempt - 1 }))
        
        const formDataToSend = new FormData()
        formDataToSend.append('file', videoForm.videoFile!)

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadState(prev => ({
            ...prev,
            progress: Math.min(prev.progress + Math.random() * 15, 85)
          }))
        }, 2000)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formDataToSend,
          signal: AbortSignal.timeout(600000) // 10 minutes
        })

        clearInterval(progressInterval)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        setUploadState(prev => ({ ...prev, progress: 90 }))
        return await response.json()

      } catch (error: any) {
        console.error(`Upload attempt ${attempt} failed:`, error)
        
        if (attempt === maxRetries) {
          throw error
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt - 1) * 2000
        await new Promise(resolve => setTimeout(resolve, delay))
        
        // Reset progress for retry
        setUploadState(prev => ({ ...prev, progress: 0 }))
      }
    }
  }

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoForm.videoFile || !videoForm.sectionId) {
      setUploadState(prev => ({ ...prev, error: 'Please fill in all required fields' }))
      return
    }

    setUploadState({
      uploading: true,
      progress: 0,
      stage: 'uploading',
      error: '',
      retryCount: 0
    })

    try {
      // Step 1: Upload video
      setUploadState(prev => ({ ...prev, stage: 'uploading' }))
      const uploadData = await uploadWithRetry()
      
      // Step 2: Create video record with AI test generation and transcript
      setUploadState(prev => ({ 
        ...prev, 
        progress: 95, 
        stage: videoForm.generateTranscript ? 'generating_transcript' : 'processing' 
      }))
      
      const videoResponse = await fetch(`/api/admin/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: videoForm.title,
          description: videoForm.description,
          videoUrl: uploadData.url,
          duration: uploadData.duration,
          aiPrompt: videoForm.aiPrompt,
          sectionId: videoForm.sectionId,
          courseId: params.courseId,
          generateTranscript: videoForm.generateTranscript // Include transcript generation
        })
      })

      if (!videoResponse.ok) {
        throw new Error('Failed to create video record')
      }

      setUploadState(prev => ({ 
        ...prev, 
        progress: 100, 
        stage: 'success' 
      }))

      // Reset form and call success callback
      setTimeout(() => {
        setVideoForm({
          title: '',
          description: '',
          aiPrompt: '',
          videoFile: null,
          sectionId: '',
          generateTranscript: false
        })
        setUploadState({
          uploading: false,
          progress: 0,
          stage: 'idle',
          error: '',
          retryCount: 0
        })
        setShowVideoForm(false)
        setPromptQuality(null)
        fetchCourse()
      }, 2000)

    } catch (error: any) {
      console.error('Upload failed:', error)
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        stage: 'error',
        error: error.message || 'Upload failed'
      }))
    }
  }

  const resetUpload = () => {
    setUploadState({
      uploading: false,
      progress: 0,
      stage: 'idle',
      error: '',
      retryCount: 0
    })
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const deleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section? All videos in this section will be moved to "Uncategorized".')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/courses/${params.courseId}/sections/${sectionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchCourse()
        setSuccess('Section deleted successfully')
      }
    } catch (error) {
      setError('Failed to delete section')
    }
  }

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? This will also delete associated tests and transcripts.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/videos/${videoId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchCourse()
        setSuccess('Video deleted successfully')
      }
    } catch (error) {
      setError('Failed to delete video')
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Test Management Functions
  const openTestManagement = (videoId: string, currentTests: Test[]) => {
    setTestManagement({
      videoId,
      showDialog: true,
      regenerating: false,
      settings: {
        difficulty: 'mixed',
        questionCount: Math.max(3, Math.min(8, currentTests.length || 5)),
        focusAreas: [],
        avoidTopics: []
      }
    })
  }

  const closeTestManagement = () => {
    setTestManagement({
      videoId: null,
      showDialog: false,
      regenerating: false,
      settings: {
        difficulty: 'mixed',
        questionCount: 5,
        focusAreas: [],
        avoidTopics: []
      }
    })
  }

  const handleRegenerateTests = async () => {
    if (!testManagement.videoId) return

    setTestManagement(prev => ({ ...prev, regenerating: true }))
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/admin/videos/${testManagement.videoId}/regenerate-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testManagement.settings)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to regenerate tests')
      }

      const result = await response.json()
      setSuccess(`Successfully generated ${result.testsCreated} new test questions!`)
      
      // Refresh course data
      await fetchCourse()
      
      // Close dialog after delay
      setTimeout(() => {
        closeTestManagement()
      }, 2000)

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to regenerate tests')
    } finally {
      setTestManagement(prev => ({ ...prev, regenerating: false }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="text-center p-8">
            <h2 className="text-xl font-semibold mb-4">Course Not Found</h2>
            <Link href="/admin/courses">
              <Button>Back to Courses</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/admin/courses"
            className="flex items-center text-primary-600 hover:text-primary-700 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Courses
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-dark-900 mb-2">
                {course.title}
              </h1>
              <p className="text-lg text-dark-600">
                Manage course sections, videos, AI-generated tests, and transcripts
              </p>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="mb-6 flex items-center p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Course Info Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-dark-700">Category:</span>
                  <p className="text-dark-900">{course.category}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-dark-700">Level:</span>
                  <p className="text-dark-900">{course.level}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-dark-700">Sections:</span>
                  <p className="text-dark-900">{course.sections?.length || 0}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-dark-700">Total Videos:</span>
                  <p className="text-dark-900">
                    {(course.sections?.reduce((acc, section) => acc + section.videos.length, 0) || 0) + (course.videos?.length || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-dark-700">AI Tests:</span>
                  <p className="text-dark-900">
                    {course.sections?.reduce((acc, section) => 
                      acc + section.videos.reduce((vidAcc, video) => vidAcc + video.tests.length, 0), 0
                    ) || 0}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-dark-700">Transcripts:</span>
                  <p className="text-dark-900">
                    {course.sections?.reduce((acc, section) => 
                      acc + section.videos.filter(video => video.transcript?.status === 'COMPLETED').length, 0
                    ) || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => setShowSectionForm(!showSectionForm)}
                  className="w-full"
                  variant="outline"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Add Section
                </Button>
                
                <Button
                  onClick={() => setShowVideoForm(!showVideoForm)}
                  className="w-full"
                  disabled={!course.sections || course.sections.length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Video
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/course/${params.courseId}`)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Course
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Add Section Form */}
            {showSectionForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Section</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSectionSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-dark-700 block mb-2">
                        Section Title *
                      </label>
                      <Input
                        name="title"
                        placeholder="e.g., Introduction to HTML"
                        value={sectionForm.title}
                        onChange={handleSectionFormChange}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-dark-700 block mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        rows={3}
                        placeholder="Describe what this section covers"
                        value={sectionForm.description}
                        onChange={handleSectionFormChange}
                        className="flex w-full rounded-md border border-dark-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <Button type="submit">
                        Create Section
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowSectionForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Video Upload Form */}
            {showVideoForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="w-5 h-5 mr-2" />
                    Add New Video with AI Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleVideoSubmit} className="space-y-6">
                    {/* Error Display */}
                    {uploadState.error && (
                      <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="text-sm">{uploadState.error}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={resetUpload}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {/* Upload Progress */}
                    {uploadState.uploading && (
                      <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-800 font-medium">
                            {uploadState.stage === 'uploading' ? 'Uploading video file...' :
                             uploadState.stage === 'processing' ? 'AI is analyzing content and generating test questions...' :
                             uploadState.stage === 'generating_transcript' ? 'AI is generating transcript...' :
                             'Processing...'}
                          </span>
                          <span className="text-blue-600">{uploadState.progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-3">
                          <div
                            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${uploadState.progress}%` }}
                          />
                        </div>
                        {uploadState.stage === 'processing' && (
                          <p className="text-xs text-blue-600">
                            AI is creating personalized test questions based on your prompt...
                          </p>
                        )}
                        {uploadState.stage === 'generating_transcript' && (
                          <p className="text-xs text-blue-600">
                            AI is generating transcript from video audio...
                          </p>
                        )}
                      </div>
                    )}

                    {/* Success Message */}
                    {uploadState.stage === 'success' && (
                      <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span className="text-sm">
                          Video uploaded successfully with AI-generated {videoForm.generateTranscript ? 'tests and transcript!' : 'tests!'}
                        </span>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-dark-700 block mb-2">
                          Video Title *
                        </label>
                        <Input
                          name="title"
                          placeholder="Enter descriptive video title"
                          value={videoForm.title}
                          onChange={handleVideoFormChange}
                          required
                          disabled={uploadState.uploading}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-dark-700 block mb-2">
                          Section *
                        </label>
                        <select
                          name="sectionId"
                          value={videoForm.sectionId}
                          onChange={handleVideoFormChange}
                          className="flex h-10 w-full rounded-md border border-dark-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          required
                          disabled={uploadState.uploading}
                        >
                          <option value="">Select a section</option>
                          {course.sections?.map(section => (
                            <option key={section.id} value={section.id}>
                              {section.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-dark-700 block mb-2">
                        Video File * (Max 200MB)
                      </label>
                      <Input
                        type="file"
                        accept="video/*,.mp4,.mov,.avi,.wmv,.mkv"
                        onChange={handleFileChange}
                        required
                        disabled={uploadState.uploading}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                      />
                      {videoForm.videoFile && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                          <p><strong>File:</strong> {videoForm.videoFile.name}</p>
                          <p><strong>Size:</strong> {(videoForm.videoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          <p><strong>Type:</strong> {videoForm.videoFile.type}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-dark-700 block mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        rows={3}
                        placeholder="Describe what this video covers and what students will learn"
                        value={videoForm.description}
                        onChange={handleVideoFormChange}
                        className="flex w-full rounded-md border border-dark-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        disabled={uploadState.uploading}
                      />
                    </div>

                    {/* Enhanced AI Prompt Section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-dark-700">
                          AI Test Generation Prompt *
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAIHelper(!showAIHelper)}
                          disabled={uploadState.uploading}
                        >
                          <Brain className="w-4 h-4 mr-1" />
                          AI Helper
                        </Button>
                      </div>
                      
                      <textarea
                        name="aiPrompt"
                        rows={4}
                        placeholder="Describe in detail what this video teaches. Include specific topics, concepts, techniques, and learning objectives. The more detailed and specific you are, the better the AI-generated test questions will be."
                        value={videoForm.aiPrompt}
                        onChange={handleVideoFormChange}
                        className="flex w-full rounded-md border border-dark-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        required
                        disabled={uploadState.uploading}
                      />

                      {/* Prompt Quality Indicator */}
                      {promptQuality && (
                        <div className={`mt-2 p-3 rounded-lg border text-sm ${getPromptQualityInfo()?.color}`}>
                          <div className="flex items-center">
                            {getPromptQualityInfo()?.icon}
                            <span className="ml-2">{getPromptQualityInfo()?.text}</span>
                          </div>
                        </div>
                      )}

                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start">
                          <Lightbulb className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-blue-800">
                            <p className="font-medium mb-1">Tips for effective AI prompts:</p>
                            <ul className="space-y-1">
                              <li>• Be specific about topics, concepts, and techniques covered</li>
                              <li>• Include technical terms, tools, or methods demonstrated</li>
                              <li>• Mention skill level and learning objectives</li>
                              <li>• Describe practical applications or examples shown</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Features Section */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-dark-700">AI Features</h4>
                      
                      <div className="flex items-center">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="generateTranscript"
                            checked={videoForm.generateTranscript}
                            onChange={handleVideoFormChange}
                            className="mr-2"
                            disabled={uploadState.uploading}
                          />
                          <span className="text-sm text-dark-700">
                            Generate AI transcript after upload
                          </span>
                        </label>
                        {process.env.NEXT_PUBLIC_HAS_OPENAI !== 'true' && (
                          <span className="ml-2 text-xs text-gray-500">(OpenAI not configured)</span>
                        )}
                      </div>

                      {videoForm.generateTranscript && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-start">
                            <FileText className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-green-800">
                              <p className="font-medium mb-1">AI Transcript Features:</p>
                              <ul className="space-y-1">
                                <li>• High accuracy speech recognition with OpenAI Whisper</li>
                                <li>• Automatic punctuation and formatting</li>
                                <li>• Support for 50+ languages</li>
                                <li>• Timestamp segments for navigation</li>
                                <li>• Searchable and downloadable text</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI Helper Panel */}
                    {showAIHelper && (
                      <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center">
                            <Brain className="w-5 h-5 mr-2 text-blue-600" />
                            AI Prompt Assistant
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-blue-900 block mb-2">
                              Select your content category:
                            </label>
                            <select
                              value={selectedCategory}
                              onChange={(e) => setSelectedCategory(e.target.value)}
                              className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Choose a category...</option>
                              {AI_PROMPT_SUGGESTIONS.map((suggestion, index) => (
                                <option key={index} value={suggestion.category}>
                                  {suggestion.category}
                                </option>
                              ))}
                            </select>
                          </div>

                          {selectedCategory && (
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                                  <Target className="w-4 h-4 mr-2" />
                                  Example Prompts:
                                </h4>
                                <div className="space-y-2">
                                  {AI_PROMPT_SUGGESTIONS
                                    .find(s => s.category === selectedCategory)
                                    ?.examples.map((example, index) => (
                                    <div key={index} className="p-3 bg-white border border-blue-200 rounded-md">
                                      <p className="text-sm text-gray-700 mb-2">{example}</p>
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => useExamplePrompt(example)}
                                        className="text-xs"
                                      >
                                        <Zap className="w-3 h-3 mr-1" />
                                        Use This Example
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                                  <HelpCircle className="w-4 h-4 mr-2" />
                                  Tips for {selectedCategory}:
                                </h4>
                                <ul className="space-y-1 text-sm text-blue-800">
                                  {AI_PROMPT_SUGGESTIONS
                                    .find(s => s.category === selectedCategory)
                                    ?.tips.map((tip, index) => (
                                    <li key={index}>• {tip}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-4">
                      <Button 
                        type="submit" 
                        disabled={uploadState.uploading || uploadState.stage === 'success'}
                        className="min-w-48"
                      >
                        {uploadState.uploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            {uploadState.stage === 'uploading' ? 'Uploading Video...' : 
                             uploadState.stage === 'processing' ? 'Generating AI Tests...' :
                             uploadState.stage === 'generating_transcript' ? 'Generating Transcript...' : 'Processing...'}
                          </>
                        ) : uploadState.stage === 'success' ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Upload Complete!
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Video & Generate AI Content
                          </>
                        )}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowVideoForm(false)}
                        disabled={uploadState.uploading}
                      >
                        Cancel
                      </Button>
                    </div>

                    {/* Upload Tips */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2 flex items-center">
                          <Zap className="w-4 h-4 mr-2" />
                          AI Test Generation
                        </h4>
                        <ul className="text-sm text-green-800 space-y-1">
                          <li>• Tests are automatically generated from your AI prompt</li>
                          <li>• Questions test understanding, not just memorization</li>
                          <li>• 3-7 questions per video (recommended)</li>
                          <li>• Multiple difficulty levels supported</li>
                          <li>• You can regenerate tests anytime</li>
                        </ul>
                      </div>

                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                          <BookOpen className="w-4 h-4 mr-2" />
                          Video Requirements
                        </h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Maximum file size: 200MB</li>
                          <li>• Supported: MP4, MOV, AVI, WMV, MKV</li>
                          <li>• Recommended: MP4 with H.264 encoding</li>
                          <li>• Automatic duration detection</li>
                          <li>• Progress tracking enabled</li>
                        </ul>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Course Sections Display */}
            <Card>
              <CardHeader>
                <CardTitle>Course Sections</CardTitle>
              </CardHeader>
              <CardContent>
                {course.sections && course.sections.length > 0 ? (
                  <div className="space-y-4">
                    {course.sections
                      .sort((a, b) => a.order - b.order)
                      .map((section, sectionIndex) => (
                      <div key={section.id} className="border border-dark-200 rounded-lg">
                        {/* Section Header */}
                        <div 
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-dark-50"
                          onClick={() => toggleSection(section.id)}
                        >
                          <div className="flex items-center">
                            <div className="flex items-center mr-3">
                              {expandedSections.has(section.id) ? (
                                <ChevronDown className="w-5 h-5" />
                              ) : (
                                <ChevronRight className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-dark-900">
                                {sectionIndex + 1}. {section.title}
                              </h3>
                              {section.description && (
                                <p className="text-sm text-dark-600">{section.description}</p>
                              )}
                              <p className="text-xs text-dark-500 mt-1">
                                {section.videos.length} videos • {section.videos.reduce((acc, v) => acc + v.tests.length, 0)} tests • {section.videos.filter(v => v.transcript?.status === 'COMPLETED').length} transcripts
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteSection(section.id)
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Section Videos */}
                        {expandedSections.has(section.id) && (
                          <div className="border-t border-dark-200 p-4">
                            {section.videos.length > 0 ? (
                              <div className="space-y-3">
                                {section.videos
                                  .sort((a, b) => a.order - b.order)
                                  .map((video, videoIndex) => (
                                  <div key={video.id} className="flex items-center p-4 bg-white border border-dark-200 rounded-lg">
                                    <div className="flex items-center mr-4">
                                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                                        <span className="text-xs font-medium text-primary-600">
                                          {videoIndex + 1}
                                        </span>
                                      </div>
                                      <Play className="w-4 h-4 text-primary-600" />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-dark-900 mb-1 truncate">
                                        {video.title}
                                      </h4>
                                      {video.description && (
                                        <p className="text-sm text-dark-600 mb-1 line-clamp-2">
                                          {video.description}
                                        </p>
                                      )}
                                      <div className="flex items-center text-xs text-dark-500 space-x-4">
                                        <div className="flex items-center">
                                          <Clock className="w-3 h-3 mr-1" />
                                          {video.duration ? formatDuration(video.duration) : 'Processing...'}
                                        </div>
                                        <div className="flex items-center">
                                          <Target className="w-3 h-3 mr-1" />
                                          {video.tests.length} test{video.tests.length !== 1 ? 's' : ''}
                                        </div>
                                        {video.aiPrompt && (
                                          <div className="flex items-center">
                                            <Brain className="w-3 h-3 mr-1" />
                                            AI Enabled
                                          </div>
                                        )}
                                        {/* Add transcript indicator */}
                                        {video.transcript && (
                                          <div className="flex items-center">
                                            <FileText className="w-3 h-3 mr-1" />
                                            <span className={
                                              video.transcript.status === 'COMPLETED' ? 'text-green-600' :
                                              video.transcript.status === 'PROCESSING' ? 'text-blue-600' :
                                              video.transcript.status === 'FAILED' ? 'text-red-600' :
                                              'text-gray-600'
                                            }>
                                              {video.transcript.status === 'COMPLETED' ? 'Transcript' :
                                               video.transcript.status === 'PROCESSING' ? 'Processing...' :
                                               video.transcript.status === 'FAILED' ? 'Failed' :
                                               'Pending'}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2 ml-4">
                                      {/* Add transcript button */}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openTranscriptManager(video.id)}
                                        className="flex items-center"
                                        title="Manage transcript"
                                      >
                                        <FileText className="w-3 h-3 mr-1" />
                                        Transcript
                                      </Button>
                                      
                                      {video.tests.length > 0 && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => openTestManagement(video.id, video.tests)}
                                          className="flex items-center"
                                        >
                                          <Settings className="w-3 h-3 mr-1" />
                                          Tests
                                        </Button>
                                      )}
                                      
                                      <Button variant="outline" size="sm">
                                        <Edit className="w-3 h-3" />
                                      </Button>
                                      
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => deleteVideo(video.id)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <Play className="w-12 h-12 text-dark-300 mx-auto mb-3" />
                                <p className="text-dark-500">No videos in this section yet.</p>
                                <Button
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => {
                                    setVideoForm(prev => ({ ...prev, sectionId: section.id }))
                                    setShowVideoForm(true)
                                  }}
                                >
                                  Add First Video
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FolderPlus className="w-16 h-16 text-dark-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-dark-700 mb-2">
                      No sections yet
                    </h3>
                    <p className="text-dark-500 mb-4">
                      Create your first section to organize your course content.
                    </p>
                    <Button onClick={() => setShowSectionForm(true)}>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Create First Section
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Test Management Dialog */}
        {testManagement.showDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <Brain className="w-6 h-6 mr-2 text-primary-600" />
                    AI Test Management
                  </h2>
                  <button
                    onClick={closeTestManagement}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={testManagement.regenerating}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Current Tests</h3>
                  <p className="text-sm text-blue-800">
                    This video currently has {
                      course.sections
                        ?.flatMap(s => s.videos)
                        ?.find(v => v.id === testManagement.videoId)?.tests.length || 0
                    } test questions. Use the settings below to generate new ones.
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={closeTestManagement}
                    disabled={testManagement.regenerating}
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    onClick={handleRegenerateTests}
                    disabled={testManagement.regenerating}
                    className="min-w-40"
                  >
                    {testManagement.regenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Generate Tests
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transcript Management Dialog */}
        {showTranscriptManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <FileText className="w-6 h-6 mr-2 text-primary-600" />
                    Transcript Management
                  </h2>
                  <button
                    onClick={closeTranscriptManager}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {(() => {
                  const video = course.sections
                    ?.flatMap(s => s.videos)
                    ?.find(v => v.id === showTranscriptManager) ||
                    course.videos?.find(v => v.id === showTranscriptManager)
                  
                  return video ? (
                    <TranscriptManager
                      videoId={video.id}
                      videoUrl={video.videoUrl}
                      videoTitle={video.title}
                      onTranscriptGenerated={(transcript) => {
                        // Refresh course data to show transcript indicator
                        fetchCourse()
                      }}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Video not found</p>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}