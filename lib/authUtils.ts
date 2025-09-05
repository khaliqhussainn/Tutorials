// Course Website: lib/authUtils.ts
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

export interface AuthenticatedUser {
  id: string
  email: string
  name: string | null
  image: string | null
}

export interface UserEnrollment {
  courseId: string
  progress: number
  completedAt: Date | null
  course: {
    id: string
    title: string
    category: string
    level: string
  }
}

// Authenticate user by email and password
export async function authenticateUser(email: string, password: string): Promise<AuthenticatedUser | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        password: true,
      }
    })
    
    if (!user || !user.password) {
      return null
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

// Get user enrollments with completed courses
export async function getUserEnrollments(userId: string): Promise<UserEnrollment[]> {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { 
        userId,
        completedAt: { not: null } // Only completed courses
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            category: true,
            level: true,
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    })

    return enrollments
  } catch (error) {
    console.error('Error fetching user enrollments:', error)
    return []
  }
}

// Get all published courses
export async function getPublishedCourses() {
  try {
    return await prisma.course.findMany({
      where: { 
        isPublished: true 
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        level: true,
        thumbnail: true,
        isPublished: true,
        rating: true,
        price: true,
        isFree: true,
        duration: true,
        prerequisites: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  } catch (error) {
    console.error('Error fetching published courses:', error)
    return []
  }
}

// Validate API key
export function validateApiKey(providedKey: string | null): boolean {
  const expectedKey = process.env.CERTIFICATE_WEBSITE_API_KEY
  
  if (!expectedKey) {
    console.error('CERTIFICATE_WEBSITE_API_KEY not configured')
    return false
  }
  
  return providedKey === expectedKey
}

// Create a test user (for development)
export async function createTestUser(email: string, password: string, name: string) {
  try {
    const hashedPassword = await bcrypt.hash(password, 12)
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'USER'
      }
    })

    console.log('Test user created:', user.email)
    return user
  } catch (error) {
    console.error('Error creating test user:', error)
    throw error
  }
}

// Mark a course as completed for a user (for testing)
export async function markCourseCompleted(userId: string, courseId: string, progress: number = 100) {
  try {
    const enrollment = await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      },
      update: {
        progress,
        completedAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        userId,
        courseId,
        progress,
        completedAt: new Date(),
        enrolledAt: new Date()
      }
    })

    console.log('Course completion marked:', { userId, courseId, progress })
    return enrollment
  } catch (error) {
    console.error('Error marking course completed:', error)
    throw error
  }
}