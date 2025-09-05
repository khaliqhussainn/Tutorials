// Course Website: app/api/auth/verify/route.ts (Final Version)
import { NextRequest, NextResponse } from "next/server"
import { authenticateUser, getUserEnrollments, validateApiKey } from "@/lib/authUtils"

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!validateApiKey(apiKey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Authenticate user
    const user = await authenticateUser(email, password)
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Get user's completed enrollments
    const enrollments = await getUserEnrollments(user.id)
    
    // Return user data with course completions for certificate platform
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      enrollments: enrollments.map(enrollment => ({
        courseId: enrollment.courseId,
        progress: enrollment.progress,
        completedAt: enrollment.completedAt?.toISOString(),
        courseTitle: enrollment.course.title,
        courseCategory: enrollment.course.category,
        courseLevel: enrollment.course.level,
      }))
    })

  } catch (error) {
    console.error('Course website auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}