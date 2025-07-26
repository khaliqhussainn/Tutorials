// lib/utils.ts - Enhanced utility functions
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return "0:00"
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export const calculateProgress = (completed: number, total: number): number => {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ')
}

export const validateVideoFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 200 * 1024 * 1024 // 200MB
  const allowedTypes = [
    'video/mp4',
    'video/mov', 
    'video/avi',
    'video/wmv',
    'video/mkv',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv'
  ]

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 200MB' }
  }

  const isValidType = allowedTypes.includes(file.type) || 
                     /\.(mp4|mov|avi|wmv|mkv|webm|m4v|3gp|flv)$/i.test(file.name)

  if (!isValidType) {
    return { valid: false, error: 'Unsupported file format. Please use MP4, MOV, AVI, WMV, or MKV' }
  }

  return { valid: true }
}
