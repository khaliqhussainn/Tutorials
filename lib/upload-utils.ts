// lib/upload-utils.ts - Utility functions for file handling
export const validateVideoFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 200 * 1024 * 1024 // 200MB
  const allowedTypes = [
    'video/mp4',
    'video/mov',
    'video/avi',
    'video/wmv',
    'video/mkv',
    'video/webm',
    'video/quicktime'
  ]

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 200MB' }
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Unsupported file format. Please use MP4, MOV, AVI, WMV, or MKV' }
  }

  return { valid: true }
}

export const getOptimalChunkSize = (fileSize: number): number => {
  if (fileSize < 10 * 1024 * 1024) return 4000000 // 4MB for files < 10MB
  if (fileSize < 50 * 1024 * 1024) return 6000000 // 6MB for files < 50MB
  if (fileSize < 100 * 1024 * 1024) return 8000000 // 8MB for files < 100MB
  return 10000000 // 10MB for larger files
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Alternative upload strategy using direct browser upload
export const getCloudinarySignature = async () => {
  const response = await fetch('/api/upload/presigned', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  })
  
  if (!response.ok) {
    throw new Error('Failed to get upload signature')
  }
  
  return response.json()
}

export const uploadDirectToCloudinary = async (file: File, onProgress?: (progress: number) => void) => {
  const signatureData = await getCloudinarySignature()
  
  const formData = new FormData()
  formData.append('file', file)
  Object.entries(signatureData.fields).forEach(([key, value]) => {
    formData.append(key, value as string)
  })

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100
        onProgress(progress)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText)
          resolve(result)
        } catch (error) {
          reject(new Error('Invalid response from upload service'))
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'))
    })

    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timeout'))
    })

    xhr.timeout = 600000 // 10 minutes
    xhr.open('POST', signatureData.url)
    xhr.send(formData)
  })
}