// app/api/user/preferences/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface UserPreferences {
  emailNotifications: boolean
  pushNotifications: boolean
  weeklyDigest: boolean
  courseRecommendations: boolean
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // In a real application, you would have a UserPreferences table
    // For now, return default preferences
    const defaultPreferences: UserPreferences = {
      emailNotifications: true,
      pushNotifications: false,
      weeklyDigest: true,
      courseRecommendations: true,
      theme: 'system',
      language: 'en',
      timezone: 'UTC'
    }

    return NextResponse.json(defaultPreferences)
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await request.json()

    // Validate preferences
    const validPreferences = {
      emailNotifications: Boolean(preferences.emailNotifications),
      pushNotifications: Boolean(preferences.pushNotifications),
      weeklyDigest: Boolean(preferences.weeklyDigest),
      courseRecommendations: Boolean(preferences.courseRecommendations),
      theme: ['light', 'dark', 'system'].includes(preferences.theme) ? preferences.theme : 'system',
      language: typeof preferences.language === 'string' ? preferences.language : 'en',
      timezone: typeof preferences.timezone === 'string' ? preferences.timezone : 'UTC'
    }

    // In a real application, you would save to UserPreferences table
    // For now, just return the validated preferences
    return NextResponse.json({
      success: true,
      preferences: validPreferences,
      message: 'Preferences updated successfully'
    })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}