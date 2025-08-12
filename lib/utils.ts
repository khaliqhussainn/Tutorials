// lib/utils.ts - UPDATED with proper duration formatting
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds === 0) {
    return "0:00"
  }
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

export function formatTimeAgo(date: Date | string): string {
  const now = new Date()
  const past = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return past.toLocaleDateString()
}

export function getVideoProgressStatus(
  video: { tests?: any[] },
  progress?: { completed: boolean; testPassed: boolean }
): 'locked' | 'available' | 'completed' | 'quiz-required' {
  if (!progress) return 'available'
  
  if (!progress.completed) return 'available'
  
  if (!video.tests || video.tests.length === 0) {
    return progress.completed ? 'completed' : 'available'
  }
  
  if (progress.completed && !progress.testPassed) {
    return 'quiz-required'
  }
  
  if (progress.completed && progress.testPassed) {
    return 'completed'
  }
  
  return 'available'
}

export function validateVideoAccess(
  allVideos: any[],
  currentVideoIndex: number,
  videoProgress: any[]
): { canWatch: boolean; reason?: string; requiredVideo?: string } {
  // First video is always accessible
  if (currentVideoIndex === 0) {
    return { canWatch: true }
  }

  // Check all previous videos
  for (let i = 0; i < currentVideoIndex; i++) {
    const prevVideo = allVideos[i]
    const prevProgress = videoProgress.find(p => p.videoId === prevVideo.id)

    // Check if previous video is completed
    if (!prevProgress?.completed) {
      return { 
        canWatch: false, 
        reason: "Previous video not completed",
        requiredVideo: prevVideo.title
      }
    }

    // If previous video has tests, check if passed
    if (prevVideo.tests && prevVideo.tests.length > 0 && !prevProgress.testPassed) {
      return { 
        canWatch: false, 
        reason: "Previous video quiz not passed",
        requiredVideo: prevVideo.title
      }
    }
  }

  return { canWatch: true }
}

export function getNextAvailableVideo(
  allVideos: any[],
  videoProgress: any[]
): any | null {
  for (let i = 0; i < allVideos.length; i++) {
    const video = allVideos[i]
    const progress = videoProgress.find(p => p.videoId === video.id)
    
    const status = getVideoProgressStatus(video, progress)
    
    if (status === 'available' || status === 'quiz-required') {
      return video
    }
  }
  
  return null
}

export function getCourseStats(
  course: any,
  videoProgress: any[]
) {
  // Get all videos from sections and legacy videos
  const allVideos = [
    ...(course.sections?.flatMap((section: any) => section.videos) || []),
    ...(course.videos || [])
  ]
  
  const totalVideos = allVideos.length
  const totalDuration = allVideos.reduce((acc: number, video: any) => acc + (video.duration || 0), 0)
  
  const completedVideos = videoProgress.filter(p => {
    const video = allVideos.find(v => v.id === p.videoId)
    if (!video) return false
    
    // If video has no tests, just check completion
    if (!video.tests || video.tests.length === 0) {
      return p.completed
    }
    
    // If video has tests, check both completion and test passed
    return p.completed && p.testPassed
  }).length
  
  const progressPercentage = calculateProgress(completedVideos, totalVideos)
  
  return {
    totalVideos,
    totalDuration,
    completedVideos,
    progressPercentage
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getVideoQuality(width?: number, height?: number): string {
  if (!width || !height) return 'Unknown'
  
  if (height >= 2160) return '4K'
  if (height >= 1440) return '1440p'
  if (height >= 1080) return '1080p'
  if (height >= 720) return '720p'
  if (height >= 480) return '480p'
  return '360p'
}

export function isValidVideoFormat(filename: string): boolean {
  const validExtensions = /\.(mp4|mov|avi|wmv|mkv|webm|m4v|3gp|flv|f4v)$/i
  return validExtensions.test(filename)
}

export function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}