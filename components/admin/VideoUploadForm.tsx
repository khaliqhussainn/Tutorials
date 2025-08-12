// components/admin/VideoUploadForm.tsx - Enhanced with duration detection
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  Upload, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  FileVideo,
  X,
  Loader2
} from 'lucide-react'
import { formatDuration, formatFileSize, isValidVideoFormat } from '@/lib/utils'

interface VideoUploadFormProps {
  courseId: string
  sectionId?: string
  onVideoCreated: (video: any) => void
  onCancel: () => void
}

interface VideoMetadata {
  duration: number
  width: number
  height: number
  size: number
  type: string
  name: string
}

export default function VideoUploadForm({
  courseId,
  sectionId,
  onVideoCreated,
  onCancel
}: VideoUploadFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [order, setOrder] = useState(1)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [creating, setCreating] = useState(false)
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)

    // Validate file type
    if (!isValidVideoFormat(file.name)) {
      setError('Please select a valid video file (MP4, MOV, AVI, WMV, MKV, WEBM)')
      return
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      setError('File size must be less than 100MB')
      return
    }

    setSelectedFile(file)
    
    // Extract video metadata
    const video = document.createElement('video')
    video.preload = 'metadata'
    
    video.onloadedmetadata = () => {
      const metadata: VideoMetadata = {
        duration: Math.round(video.duration),
        width: video.videoWidth,
        height: video.videoHeight,
        size: file.size,
        type: file.type,
        name: file.name
      }
      
      setVideoMetadata(metadata)
      
      // Auto-generate title from filename if not set
      if (!title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        setTitle(nameWithoutExt.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
      }
      
      window.URL.revokeObjectURL(video.src)
    }
    
    video.onerror = () => {
      setError('Could not read video metadata. Please ensure this is a valid video file.')
      window.URL.revokeObjectURL(video.src)
    }
    
    video.src = URL.createObjectURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || !videoMetadata) {
      setError('Please select a valid video file first')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const xhr = new XMLHttpRequest()
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText)
          setUploadedVideoUrl(result.url)
          
          // Update metadata with server response if available
          if (result.duration) {
            setVideoMetadata(prev => prev ? {
              ...prev,
              duration: Math.round(result.duration)
            } : null)
          }
        } else {
          const error = JSON.parse(xhr.responseText)
          setError(error.error || 'Upload failed')
        }
        setUploading(false)
      }

      xhr.onerror = () => {
        setError('Upload failed. Please check your connection and try again.')
        setUploading(false)
      }

      xhr.open('POST', '/api/upload')
      xhr.send(formData)

    } catch (error) {
      console.error('Upload error:', error)
      setError('Upload failed. Please try again.')
      setUploading(false)
    }
  }

  const handleCreateVideo = async () => {
    if (!uploadedVideoUrl || !videoMetadata) {
      setError('Please upload a video first')
      return
    }

    if (!title.trim()) {
      setError('Please enter a video title')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          videoUrl: uploadedVideoUrl,
          duration: videoMetadata.duration, // Ensure duration is included
          courseId,
          sectionId: sectionId || null,
          order
        })
      })

      if (response.ok) {
        const video = await response.json()
        onVideoCreated(video)
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to create video')
      }
    } catch (error) {
      console.error('Create video error:', error)
      setError('Failed to create video. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
    setVideoMetadata(null)
    setUploadedVideoUrl(null)
    setUploadProgress(0)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileVideo className="w-5 h-5 mr-2" />
          Add New Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video File
          </label>
          
          {!selectedFile ? (
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Click to select a video file</p>
              <p className="text-sm text-gray-500">
                Supports MP4, MOV, AVI, WMV, MKV, WEBM (Max 100MB)
              </p>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <FileVideo className="w-8 h-8 text-purple-600 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    {videoMetadata && (
                      <div className="text-sm text-gray-600 space-y-1 mt-1">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatDuration(videoMetadata.duration)}
                          </span>
                          <span>{formatFileSize(videoMetadata.size)}</span>
                          <span>{videoMetadata.width}x{videoMetadata.height}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Upload Button */}
        {selectedFile && !uploadedVideoUrl && (
          <Button 
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading... {uploadProgress}%
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Video
              </>
            )}
          </Button>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {/* Success Message */}
        {uploadedVideoUrl && (
          <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-800">Video uploaded successfully!</span>
          </div>
        )}

        {/* Video Details Form */}
        {uploadedVideoUrl && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter video title..."
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter video description..."
                rows={3}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order
              </label>
              <Input
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value))}
                min={1}
                className="w-full"
              />
            </div>
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          
          {uploadedVideoUrl && (
            <Button 
              onClick={handleCreateVideo}
              disabled={creating || !title.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Video'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}