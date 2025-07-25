// components/upload/CloudinaryUpload.tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

interface CloudinaryUploadProps {
  onUpload: (result: any) => void
}

export default function CloudinaryUpload({ onUpload }: CloudinaryUploadProps) {
  useEffect(() => {
    // Load Cloudinary upload widget script
    const script = document.createElement('script')
    script.src = 'https://widget.cloudinary.com/v2.0/global/all.js'
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const openUploadWidget = () => {
    // @ts-ignore
    window.cloudinary.openUploadWidget(
      {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: 'your_upload_preset', // Create this in Cloudinary dashboard
        sources: ['local', 'url', 'camera'],
        resourceType: 'video',
        maxFileSize: 100000000, // 100MB
        folder: 'training-videos',
        clientAllowedFormats: ['mp4', 'mov', 'avi', 'wmv'],
        maxVideoFileSize: 100000000,
        showAdvancedOptions: true,
        cropping: false,
        multiple: false,
        styles: {
          palette: {
            window: '#FFFFFF',
            windowBorder: '#90A0B3',
            tabIcon: '#8b5cf6',
            menuIcons: '#5A616A',
            textDark: '#000000',
            textLight: '#FFFFFF',
            link: '#8b5cf6',
            action: '#8b5cf6',
            inactiveTabIcon: '#0E2F5A',
            error: '#F44235',
            inProgress: '#0078FF',
            complete: '#20B832',
            sourceBg: '#E4EBF1'
          }
        }
      },
      (error: any, result: any) => {
        if (!error && result && result.event === 'success') {
          onUpload(result.info)
        }
        if (error) {
          console.error('Cloudinary upload error:', error)
        }
      }
    )
  }

  return (
    <Button onClick={openUploadWidget} type="button">
      Upload with Cloudinary Widget
    </Button>
  )
}