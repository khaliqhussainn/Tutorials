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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Try to get user preferences from database
    let userPrefs = await prisma.userPreferences.findUnique({
      where: { userId: user.id }
    })

    // If no preferences exist, create default ones
    if (!userPrefs) {
      userPrefs = await prisma.userPreferences.create({
        data: {
          userId: user.id,
          emailNotifications: true,
          pushNotifications: false,
          weeklyDigest: true,
          courseRecommendations: true,
          theme: 'system'
        }
      })
    }

    const preferences: UserPreferences = {
      emailNotifications: userPrefs.emailNotifications,
      pushNotifications: userPrefs.pushNotifications,
      weeklyDigest: userPrefs.weeklyDigest,
      courseRecommendations: userPrefs.courseRecommendations,
      theme: userPrefs.theme as 'light' | 'dark' | 'system',
      language: 'en', // Default since not in schema
      timezone: 'UTC' // Default since not in schema
    }

    return NextResponse.json(preferences)
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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const preferences = await request.json()

    // Validate preferences
    const validPreferences = {
      emailNotifications: Boolean(preferences.emailNotifications),
      pushNotifications: Boolean(preferences.pushNotifications),
      weeklyDigest: Boolean(preferences.weeklyDigest),
      courseRecommendations: Boolean(preferences.courseRecommendations),
      theme: ['light', 'dark', 'system'].includes(preferences.theme) ? preferences.theme : 'system'
    }

    // Update or create user preferences
    const updatedPrefs = await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: validPreferences,
      create: {
        userId: user.id,
        ...validPreferences
      }
    })

    return NextResponse.json({
      success: true,
      preferences: {
        ...validPreferences,
        language: 'en',
        timezone: 'UTC'
      },
      message: 'Preferences updated successfully'
    })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}