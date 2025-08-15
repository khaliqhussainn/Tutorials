// components/ui/AvatarUpload.tsx
'use client'

import { useState } from 'react'
import { Camera, X, Loader2, User } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

interface AvatarUploadProps {
  currentImage?: string | null
  userName?: string | null
  userEmail?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onAvatarUpdate?: (newImageUrl: string | null) => void
  className?: string
  disabled?: boolean
}

const sizeConfig = {
  sm: { container: 'w-12 h-12', text: 'text-lg', icon: 'w-3 h-3', button: 'w-6 h-6' },
  md: { container: 'w-20 h-20', text: 'text-2xl', icon: 'w-4 h-4', button: 'w-8 h-8' },
  lg: { container: 'w-32 h-32', text: 'text-4xl', icon: 'w-5 h-5', button: 'w-10 h-10' },
  xl: { container: 'w-40 h-40', text: 'text-5xl', icon: 'w-6 h-6', button: 'w-12 h-12' }
}

export default function AvatarUpload({
  currentImage,
  userName,
  userEmail,
  size = 'lg',
  onAvatarUpdate,
  className = '',
  disabled = false
}: AvatarUploadProps) {
  const { update } = useSession()
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(currentImage || null)
  
  const config = sizeConfig[size]

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload avatar')
      }

      const result = await response.json()
      const newImageUrl = result.user.image

      setImageUrl(newImageUrl)
      onAvatarUpdate?.(newImageUrl)

      // Update session if needed
      await update({
        user: {
          image: newImageUrl,
        },
      })

      toast.success('Avatar updated successfully!')
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      toast.error(error.message || 'Failed to upload avatar')
    } finally {
      setUploading(false)
      // Reset file input
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    setUploading(true)
    try {
      const response = await fetch('/api/user/upload-avatar', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove avatar')
      }

      setImageUrl(null)
      onAvatarUpdate?.(null)

      // Update session
      await update({
        user: {
          image: null,
        },
      })

      toast.success('Avatar removed successfully!')
    } catch (error: any) {
      console.error('Error removing avatar:', error)
      toast.error(error.message || 'Failed to remove avatar')
    } finally {
      setUploading(false)
    }
  }

  const getInitials = () => {
    if (userName) {
      return userName
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase()
    }
    return userEmail?.charAt(0).toUpperCase() || 'U'
  }

  return (
    <div className={`relative group ${className}`}>
      {/* Avatar Container */}
      <div className={`
        ${config.container} 
        rounded-2xl 
        flex items-center justify-center 
        overflow-hidden
        border border-gray-200
        shadow-lg
        transition-all duration-200
        ${disabled ? 'opacity-50' : 'group-hover:shadow-xl'}
      `}>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <span className={`${config.text} font-bold text-white`}>
              {getInitials()}
            </span>
          </div>
        )}
        
        {/* Upload overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className={`${config.icon} text-white animate-spin`} />
          </div>
        )}

        {/* Hover overlay for larger sizes */}
        {size === 'lg' || size === 'xl' ? (
          <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Camera className="w-6 h-6 text-white" />
          </div>
        ) : null}
      </div>
      
      {/* Action buttons */}
      {!disabled && (
        <div className="absolute -bottom-2 -right-2 flex gap-1">
          {/* Upload button */}
          <label className={`
            ${config.button}
            bg-primary-500 
            rounded-lg 
            flex items-center justify-center 
            hover:bg-primary-400 
            transition-all duration-200 
            shadow-lg 
            border-2 border-white 
            cursor-pointer 
            ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}
          `}>
            <Camera className={`${config.icon === 'w-3 h-3' ? 'w-3 h-3' : 'w-4 h-4'} text-white`} />
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={uploading || disabled}
            />
          </label>
          
          {/* Remove button - only show if there's an image */}
          {imageUrl && (
            <button
              onClick={handleRemoveAvatar}
              disabled={uploading || disabled}
              className={`
                ${config.button}
                bg-red-500 
                rounded-lg 
                flex items-center justify-center 
                hover:bg-red-400 
                transition-all duration-200 
                shadow-lg 
                border-2 border-white 
                ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}
              `}
            >
              <X className={`${config.icon === 'w-3 h-3' ? 'w-3 h-3' : 'w-4 h-4'} text-white`} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// components/ui/SimpleAvatar.tsx - For display-only purposes
interface SimpleAvatarProps {
  imageUrl?: string | null
  userName?: string | null
  userEmail?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const simpleAvatarSizes = {
  xs: { container: 'w-6 h-6', text: 'text-xs' },
  sm: { container: 'w-8 h-8', text: 'text-sm' },
  md: { container: 'w-12 h-12', text: 'text-lg' },
  lg: { container: 'w-16 h-16', text: 'text-xl' },
  xl: { container: 'w-20 h-20', text: 'text-2xl' }
}

export function SimpleAvatar({
  imageUrl,
  userName,
  userEmail,
  size = 'md',
  className = ''
}: SimpleAvatarProps) {
  const config = simpleAvatarSizes[size]

  const getInitials = () => {
    if (userName) {
      return userName
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase()
    }
    return userEmail?.charAt(0).toUpperCase() || 'U'
  }

  return (
    <div className={`
      ${config.container} 
      rounded-full 
      flex items-center justify-center 
      overflow-hidden
      border border-gray-200
      shadow-sm
      ${className}
    `}>
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt="Profile" 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
          <span className={`${config.text} font-semibold text-white`}>
            {getInitials()}
          </span>
        </div>
      )}
    </div>
  )
}