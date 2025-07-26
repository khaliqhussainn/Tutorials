// app/admin/courses/[courseId]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
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
  GripVertical,
  ChevronDown,
  ChevronRight,
  X,
  RefreshCw
} from 'lucide-react'

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
  tests: { id: string }[]
  sectionId?: string
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
}

interface UploadState {
  uploading: boolean
  progress: number
  stage: 'idle' | 'uploading' | 'processing' | 'success' | 'error'
  error: string
  retryCount: number
}

export default function CourseManagementPage({ params }: { params: { courseId: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSectionForm, setShowSectionForm] = useState(false)
  const [showVideoForm, setShowVideoForm] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [sectionForm, setSectionForm] = useState<SectionFormData>({
    title: '',
    description: ''
  })
  
  const [videoForm, setVideoForm] = useState<VideoFormData>({
    title: '',
    description: '',
    aiPrompt: '',
    videoFile: null,
    sectionId: ''
  })

  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    stage: 'idle',
    error: '',
    retryCount: 0
  })

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

  const handleSectionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSectionForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/courses/${params.courseId}/sections`, {
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
    const { name, value } = e.target
    setVideoForm(prev => ({ ...prev, [name]: value }))
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
          // Add timeout handling
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
        const delay = Math.pow(2, attempt - 1) * 2000 // 2s, 4s, 8s
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
      
      // Step 2: Create video record
      setUploadState(prev => ({ 
        ...prev, 
        progress: 95, 
        stage: 'processing' 
      }))
      
      const videoResponse = await fetch(`/api/courses/${params.courseId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: videoForm.title,
          description: videoForm.description,
          videoUrl: uploadData.url,
          duration: uploadData.duration,
          aiPrompt: videoForm.aiPrompt,
          sectionId: videoForm.sectionId
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
          sectionId: ''
        })
        setUploadState({
          uploading: false,
          progress: 0,
          stage: 'idle',
          error: '',
          retryCount: 0
        })
        setShowVideoForm(false)
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

  const getProgressColor = () => {
    if (uploadState.stage === 'error') return 'bg-red-500'
    if (uploadState.stage === 'success') return 'bg-green-500'
    return 'bg-primary-600'
  }

  const getStageText = () => {
    switch (uploadState.stage) {
      case 'uploading': return `Uploading video... ${uploadState.retryCount > 0 ? `(Retry ${uploadState.retryCount})` : ''}`
      case 'processing': return 'Processing and generating tests...'
      case 'success': return 'Upload completed successfully!'
      case 'error': return 'Upload failed'
      default: return ''
    }
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
      const response = await fetch(`/api/admin/sections/${sectionId}`, {
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
    if (!confirm('Are you sure you want to delete this video? This will also delete associated tests.')) {
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
                Manage course sections and videos
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

            {/* Enhanced Add Video Form */}
            {showVideoForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Add New Video</CardTitle>
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
                          <span className="text-blue-800 font-medium">{getStageText()}</span>
                          <span className="text-blue-600">{uploadState.progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${getProgressColor()}`}
                            style={{ width: `${uploadState.progress}%` }}
                          />
                        </div>
                        {uploadState.stage === 'uploading' && (
                          <p className="text-xs text-blue-600">
                            Large files may take several minutes to upload. Please keep this page open.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Success Message */}
                    {uploadState.stage === 'success' && (
                      <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span className="text-sm">Video uploaded successfully with AI-generated tests!</span>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-dark-700 block mb-2">
                          Video Title *
                        </label>
                        <Input
                          name="title"
                          placeholder="Enter video title"
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
                      <div className="relative">
                        <Input
                          type="file"
                          accept="video/*,.mp4,.mov,.avi,.wmv,.mkv"
                          onChange={handleFileChange}
                          required
                          disabled={uploadState.uploading}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                        />
                      </div>
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
                        placeholder="Describe what this video covers"
                        value={videoForm.description}
                        onChange={handleVideoFormChange}
                        className="flex w-full rounded-md border border-dark-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        disabled={uploadState.uploading}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-dark-700 block mb-2">
                        AI Test Prompt *
                      </label>
                      <textarea
                        name="aiPrompt"
                        rows={3}
                        placeholder="Provide context for AI to generate relevant test questions (e.g., 'This video covers HTML basics, including tags, attributes, and document structure')"
                        value={videoForm.aiPrompt}
                        onChange={handleVideoFormChange}
                        className="flex w-full rounded-md border border-dark-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        required
                        disabled={uploadState.uploading}
                      />
                      <p className="text-xs text-dark-500 mt-1">
                        This helps AI generate relevant test questions for this video
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-4">
                      <Button 
                        type="submit" 
                        disabled={uploadState.uploading || uploadState.stage === 'success'}
                        className="min-w-32"
                      >
                        {uploadState.uploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Uploading...
                          </>
                        ) : uploadState.stage === 'success' ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Uploaded
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Video
                          </>
                        )}
                      </Button>
                      
                      {uploadState.stage === 'error' && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetUpload}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Try Again
                        </Button>
                      )}
                      
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
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Upload Tips:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Maximum file size: 200MB</li>
                        <li>• Supported formats: MP4, MOV, AVI, WMV, MKV</li>
                        <li>• For best results, use MP4 format with H.264 encoding</li>
                        <li>• Ensure stable internet connection for large files</li>
                        <li>• Upload will retry automatically if it fails</li>
                      </ul>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Course Sections */}
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
                                {section.videos.length} videos
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
                                  <div key={video.id} className="flex items-center p-3 bg-white border border-dark-200 rounded-lg">
                                    <div className="flex items-center mr-3">
                                      <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                                        <span className="text-xs font-medium text-primary-600">
                                          {videoIndex + 1}
                                        </span>
                                      </div>
                                      <Play className="w-4 h-4 text-primary-600" />
                                    </div>
                                    
                                    <div className="flex-1">
                                      <h4 className="font-medium text-dark-900 mb-1">
                                        {video.title}
                                      </h4>
                                      {video.description && (
                                        <p className="text-sm text-dark-600 mb-1">
                                          {video.description}
                                        </p>
                                      )}
                                      <div className="flex items-center text-xs text-dark-500 space-x-4">
                                        <div className="flex items-center">
                                          <Clock className="w-3 h-3 mr-1" />
                                          {video.duration ? formatDuration(video.duration) : 'Processing...'}
                                        </div>
                                        <div>
                                          Tests: {video.tests.length}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
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

            {/* Legacy Videos (without sections) */}
            {course.videos && course.videos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Uncategorized Videos</CardTitle>
                  <p className="text-sm text-dark-600">
                    These videos don't belong to any section. Consider moving them to a section.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {course.videos.map((video, index) => (
                      <div key={video.id} className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <Play className="w-4 h-4 text-yellow-600 mr-3" />
                        <div className="flex-1">
                          <h4 className="font-medium text-dark-900">{video.title}</h4>
                          <p className="text-sm text-dark-600">{video.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteVideo(video.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}