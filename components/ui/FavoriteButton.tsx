// components/ui/FavoriteButton.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Heart, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  courseId: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'icon' | 'button'
  showText?: boolean
  onFavoriteChange?: (isFavorited: boolean) => void
}

export default function FavoriteButton({
  courseId,
  className = '',
  size = 'md',
  variant = 'icon',
  showText = false,
  onFavoriteChange
}: FavoriteButtonProps) {
  const { data: session } = useSession()
  const [isFavorited, setIsFavorited] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  const sizeConfig = {
    sm: { icon: 'w-4 h-4', container: 'w-8 h-8', text: 'text-sm' },
    md: { icon: 'w-5 h-5', container: 'w-10 h-10', text: 'text-base' },
    lg: { icon: 'w-6 h-6', container: 'w-12 h-12', text: 'text-lg' }
  }

  const config = sizeConfig[size]

  useEffect(() => {
    if (session && courseId) {
      checkFavoriteStatus()
    } else {
      setIsChecking(false)
    }
  }, [session, courseId])

  const checkFavoriteStatus = async () => {
    try {
      setIsChecking(true)
      const response = await fetch('/api/user/favorites/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId }),
      })

      if (response.ok) {
        const data = await response.json()
        setIsFavorited(data.isFavorited)
      }
    } catch (error) {
      console.error('Error checking favorite status:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const toggleFavorite = async () => {
    if (!session) {
      toast.error('Please sign in to save favorites')
      return
    }

    setIsLoading(true)
    try {
      const method = isFavorited ? 'DELETE' : 'POST'
      const response = await fetch('/api/user/favorites', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId }),
      })

      const data = await response.json()

      if (response.ok) {
        const newFavoriteStatus = !isFavorited
        setIsFavorited(newFavoriteStatus)
        onFavoriteChange?.(newFavoriteStatus)
        
        toast.success(
          newFavoriteStatus 
            ? 'Added to favorites!' 
            : 'Removed from favorites'
        )
      } else {
        // Handle specific error cases
        if (response.status === 409) {
          setIsFavorited(true)
          toast.info('Course is already in your favorites')
        } else if (response.status === 404 && method === 'DELETE') {
          setIsFavorited(false)
          toast.info('Course was not in your favorites')
        } else {
          throw new Error(data.error || 'Failed to update favorites')
        }
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error)
      toast.error(error.message || 'Failed to update favorites')
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    return null
  }

  if (variant === 'button') {
    return (
      <button
        onClick={toggleFavorite}
        disabled={isLoading || isChecking}
        className={cn(
          'inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200',
          isFavorited
            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-red-600',
          isLoading && 'opacity-50 cursor-not-allowed',
          config.text,
          className
        )}
      >
        {isLoading || isChecking ? (
          <Loader2 className={cn(config.icon, 'animate-spin mr-2')} />
        ) : (
          <Heart 
            className={cn(
              config.icon, 
              'mr-2 transition-all duration-200',
              isFavorited ? 'fill-current text-red-500' : ''
            )} 
          />
        )}
        {showText && (
          <span>
            {isChecking ? 'Loading...' : isFavorited ? 'Favorited' : 'Add to Favorites'}
          </span>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={isLoading || isChecking}
      className={cn(
        'relative flex items-center justify-center rounded-full transition-all duration-200 group',
        config.container,
        isFavorited
          ? 'bg-red-50 text-red-500 hover:bg-red-100'
          : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500',
        'shadow-lg hover:shadow-xl',
        isLoading && 'opacity-50 cursor-not-allowed',
        className
      )}
      title={
        isChecking 
          ? 'Loading...' 
          : isFavorited 
            ? 'Remove from favorites' 
            : 'Add to favorites'
      }
    >
      {isLoading || isChecking ? (
        <Loader2 className={cn(config.icon, 'animate-spin')} />
      ) : (
        <Heart 
          className={cn(
            config.icon,
            'transition-all duration-200 group-hover:scale-110',
            isFavorited ? 'fill-current' : ''
          )} 
        />
      )}
    </button>
  )
}

// Hook for managing favorites
export function useFavorites() {
  const { data: session } = useSession()
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) {
      fetchFavorites()
    }
  }, [session])

  const fetchFavorites = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/favorites')
      if (response.ok) {
        const data = await response.json()
        setFavorites(data.map((fav: any) => fav.courseId))
      }
    } catch (error) {
      console.error('Error fetching favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const isFavorited = (courseId: string) => favorites.includes(courseId)

  const toggleFavorite = async (courseId: string) => {
    if (!session) return false

    try {
      const method = isFavorited(courseId) ? 'DELETE' : 'POST'
      const response = await fetch('/api/user/favorites', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId }),
      })

      if (response.ok) {
        if (method === 'POST') {
          setFavorites(prev => [...prev, courseId])
        } else {
          setFavorites(prev => prev.filter(id => id !== courseId))
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Error toggling favorite:', error)
      return false
    }
  }

  return {
    favorites,
    loading,
    isFavorited,
    toggleFavorite,
    refetch: fetchFavorites
  }
}