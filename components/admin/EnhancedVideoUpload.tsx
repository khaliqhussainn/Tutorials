'use client'
import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  FileVideo,
  FileText,
  Zap,
  AlertCircle,
  Clock,
  Play,
  Settings,
  Info
} from 'lucide-react'

interface UploadProgress {
  upload: number
  video: number
  transcript: number
}

interface VideoUploadProps {
  courseId: string
  sectionId?: string
  onVideoCreated?: (video: any) => void
  onUploadComplete?: () => void
}

export default function EnhancedVideoUploadForm({
  courseId,
  sectionId,
  onVideoCreated,
  onUploadComplete
}: VideoUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress>({ upload: 0, video: 0, transcript: 0 })
  const [currentStep, setCurrentStep] = useState<'select' | 'upload' | 'creating' | 'transcript' | 'complete'>('select')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form data
  const [videoData, setVideoData] = useState({
    title: '',
    description: '',
    order: 1
  })

  // Upload settings
  const [autoTranscript, setAutoTranscript] = useState(true)
  const [uploadedVideo, setUploadedVideo] = useState<any>(null)

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return
    // Validate file type
    const validTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/wmv', 'video/mkv', 'video/webm']
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please select a valid video file (MP4, MOV, AVI, WMV, MKV, WEBM)')
      return
    }
    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 100MB')
      return
    }
    setFile(selectedFile)
    setError(null)

    // Auto-generate title from filename
    if (!videoData.title) {
      const title = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
      setVideoData(prev => ({ ...prev, title: title.charAt(0).toUpperCase() + title.slice(1) }))
    }
  }, [videoData.title])

  const uploadVideo = async () => {
    if (!file || !videoData.title.trim()) {
      setError('Please fill in all required fields')
      return
    }
    setUploading(true)
    setCurrentStep('upload')
    setError(null)
    setSuccess(null)
    try {
      // Step 1: Upload video to Cloudinary
      console.log('Starting video upload...')
      const formData = new FormData()
      formData.append('file', file)
      formData.append('generateTranscript', autoTranscript.toString())
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'Failed to upload video')
      }
      const uploadResult = await uploadResponse.json()
      setProgress(prev => ({ ...prev, upload: 100 }))
      setCurrentStep('creating')
      console.log('Video uploaded successfully:', uploadResult)

      // Step 2: Create video record in database
      console.log('Creating video record...')
      const createVideoResponse = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: videoData.title.trim(),
          description: videoData.description.trim() || null,
          videoUrl: uploadResult.url,
          duration: uploadResult.duration,
          courseId,
          sectionId: sectionId || null,
          order: videoData.order,
          autoGenerateTranscript: autoTranscript
        })
      })
      if (!createVideoResponse.ok) {
        const errorData = await createVideoResponse.json()
        throw new Error(errorData.error || 'Failed to create video record')
      }
      const createdVideo = await createVideoResponse.json()
      setUploadedVideo(createdVideo)
      setProgress(prev => ({ ...prev, video: 100 }))

      console.log('Video created successfully:', createdVideo)
      onVideoCreated?.(createdVideo)

      // Step 3: Handle transcript status
      if (autoTranscript && createdVideo.transcriptStatus === 'queued') {
        setCurrentStep('transcript')
        setProgress(prev => ({ ...prev, transcript: 50 }))
        setSuccess(`Video uploaded successfully! Transcript generation is running in the background.`)

        // Simulate transcript progress (since it's async)
        setTimeout(() => {
          setProgress(prev => ({ ...prev, transcript: 100 }))
          setCurrentStep('complete')
        }, 2000)
      } else {
        setCurrentStep('complete')
        setProgress(prev => ({ ...prev, transcript: 100 }))

        if (createdVideo.transcriptStatus === 'skipped') {
          setSuccess('Video uploaded successfully! Transcript generation was skipped.')
        } else if (createdVideo.transcriptStatus === 'failed_to_queue') {
          setSuccess('Video uploaded successfully! Transcript generation failed to queue but can be generated manually later.')
        } else {
          setSuccess('Video uploaded successfully!')
        }
      }

      // Call onUploadComplete if it exists
      if (onUploadComplete) {
        onUploadComplete()
      }
    } catch (error: unknown) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Upload failed. Please try again.')
      setCurrentStep('select')
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setVideoData({ title: '', description: '', order: 1 })
    setProgress({ upload: 0, video: 0, transcript: 0 })
    setCurrentStep('select')
    setError(null)
    setSuccess(null)
    setUploadedVideo(null)
  }

  const getStepStatus = (step: string) => {
    const steps = ['upload', 'creating', 'transcript', 'complete']
    const currentIndex = steps.indexOf(currentStep)
    const stepIndex = steps.indexOf(step)

    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'current'
    return 'pending'
  }

  const hasOpenAIKey = process.env.NEXT_PUBLIC_HAS_OPENAI_KEY === 'true'

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileVideo className="w-5 h-5 mr-2" />
          Upload Video with Auto-Transcript
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error/Success Display */}
        {error && (
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <XCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Progress Steps */}
        {uploading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Upload Progress</span>
              <span className="text-gray-500">
                {currentStep === 'upload' && 'Uploading video...'}
                {currentStep === 'creating' && 'Creating video record...'}
                {currentStep === 'transcript' && 'Processing transcript...'}
                {currentStep === 'complete' && 'Complete!'}
              </span>
            </div>
            <div className="space-y-2">
              {/* Video Upload Progress */}
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  getStepStatus('upload') === 'completed' ? 'bg-green-500' :
                  getStepStatus('upload') === 'current' ? 'bg-blue-500' : 'bg-gray-300'
                }`}>
                  {getStepStatus('upload') === 'completed' ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : getStepStatus('upload') === 'current' ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span className="text-sm">Upload Video</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.upload}%` }}
                  />
                </div>
              </div>
              {/* Video Creation Progress */}
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  getStepStatus('creating') === 'completed' ? 'bg-green-500' :
                  getStepStatus('creating') === 'current' ? 'bg-blue-500' : 'bg-gray-300'
                }`}>
                  {getStepStatus('creating') === 'completed' ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : getStepStatus('creating') === 'current' ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span className="text-sm">Create Video Record</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.video}%` }}
                  />
                </div>
              </div>
              {/* Transcript Generation Progress */}
              {autoTranscript && (
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    getStepStatus('transcript') === 'completed' ? 'bg-green-500' :
                    getStepStatus('transcript') === 'current' ? 'bg-purple-500' : 'bg-gray-300'
                  }`}>
                    {getStepStatus('transcript') === 'completed' ? (
                      <CheckCircle className="w-4 h-4 text-white" />
                    ) : getStepStatus('transcript') === 'current' ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <span className="text-sm">Generate Transcript</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.transcript}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success State */}
        {currentStep === 'complete' && uploadedVideo && (
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
              <div>
                <p className="font-medium text-green-800">Video uploaded successfully!</p>
                <p className="text-sm text-green-600">
                  {autoTranscript ? 'Video and transcript processing complete' : 'Video is ready for viewing'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Play className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{uploadedVideo.title}</p>
                  <p className="text-sm text-gray-600">
                    {uploadedVideo.duration ? `${Math.round(uploadedVideo.duration / 60)} minutes` : 'Duration: Unknown'}
                    {uploadedVideo.transcriptStatus === 'queued' && ' • Transcript processing...'}
                  </p>
                </div>
              </div>
              <Button onClick={resetForm} variant="outline">
                Upload Another
              </Button>
            </div>
            {uploadedVideo.transcriptMessage && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">{uploadedVideo.transcriptMessage}</p>
              </div>
            )}
          </div>
        )}

        {/* Upload Form */}
        {!uploading && currentStep !== 'complete' && (
          <div className="space-y-4">
            {/* File Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video File *
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="video-upload"
                />
                <label
                  htmlFor="video-upload"
                  className={`flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {file ? (
                    <div className="text-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-green-800">{file.name}</p>
                      <p className="text-xs text-green-600">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to select video file</p>
                      <p className="text-xs text-gray-500">MP4, MOV, AVI, WMV, MKV, WEBM (max 100MB)</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
            {/* Video Details */}
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video Title *
                </label>
                <Input
                  type="text"
                  value={videoData.title}
                  onChange={(e) => setVideoData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter video title"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={videoData.description}
                  onChange={(e) => setVideoData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the video content"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  maxLength={1000}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order
                </label>
                <Input
                  type="number"
                  value={videoData.order}
                  onChange={(e) => setVideoData(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                  min={1}
                  className="w-full"
                />
              </div>
            </div>
            {/* Auto-transcript Settings */}
            <div className="space-y-4 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900 flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Upload Settings
                </h4>
              </div>
              {/* Auto-transcript Toggle */}
              <div className={`flex items-center justify-between p-4 rounded-lg border ${
                hasOpenAIKey ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center">
                  <FileText className={`w-5 h-5 mr-3 ${hasOpenAIKey ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div>
                    <p className={`font-medium ${hasOpenAIKey ? 'text-blue-900' : 'text-gray-700'}`}>
                      Auto-generate Transcript
                    </p>
                    <p className={`text-sm ${hasOpenAIKey ? 'text-blue-700' : 'text-gray-500'}`}>
                      {hasOpenAIKey
                        ? 'Automatically create a transcript using AI after upload'
                        : 'OpenAI API key required for auto-transcript generation'
                      }
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoTranscript && hasOpenAIKey}
                    onChange={(e) => setAutoTranscript(e.target.checked)}
                    disabled={!hasOpenAIKey}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full peer transition-colors ${
                    !hasOpenAIKey ? 'bg-gray-300 cursor-not-allowed' :
                    autoTranscript ? 'bg-blue-600' : 'bg-gray-200'
                  } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                </label>
              </div>
              {!hasOpenAIKey && (
                <div className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">OpenAI API Key Required</p>
                    <p>To enable automatic transcript generation, add your OpenAI API key to the environment variables.</p>
                  </div>
                </div>
              )}
            </div>
            {/* Upload Button */}
            <Button
              onClick={uploadVideo}
              disabled={!file || !videoData.title.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Zap className="w-5 h-5 mr-2" />
              Upload Video {autoTranscript && hasOpenAIKey && '& Generate Transcript'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
