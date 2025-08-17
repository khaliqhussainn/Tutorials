// app/api/enrollments/route.ts - PRODUCTION FIXED
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Enhanced user lookup with better error handling
async function findUserBySession(session: any) {
  if (!session?.user) {
    throw new Error("No session user provided")
  }

  console.log("🔍 Finding user with session:", {
    id: session.user.id,
    email: session.user.email,
    hasSession: !!session
  })

  let user = null

  // Method 1: Try by session ID first
  if (session.user.id) {
    try {
      user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, email: true, name: true }
      })
      
      if (user) {
        console.log("✅ User found by ID:", user.id)
        return user
      }
    } catch (error) {
      console.error("❌ Error finding user by ID:", error)
    }
  }

  // Method 2: Try by email
  if (session.user.email) {
    try {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true, name: true }
      })
      
      if (user) {
        console.log("✅ User found by email:", user.id)
        return user
      }
    } catch (error) {
      console.error("❌ Error finding user by email:", error)
    }
  }

  console.error("❌ User not found in database")
  throw new Error("User not found in database")
}

export async function POST(request: Request) {
  console.log("=== ENROLLMENT API START ===")
  
  try {
    const body = await request.json()
    const { courseId } = body

    console.log("📝 Enrollment request:", { courseId })

    if (!courseId) {
      console.log("❌ No courseId provided")
      return NextResponse.json(
        { 
          error: "Course ID is required", 
          code: "MISSING_COURSE_ID" 
        }, 
        { status: 400 }
      )
    }

    // Get session with detailed logging
    const session = await getServerSession(authOptions)
    console.log("🔐 Session check:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      userId: session?.user?.id
    })

    if (!session?.user) {
      console.log("❌ No valid session found")
      return NextResponse.json(
        { 
          error: "Authentication required", 
          code: "AUTH_REQUIRED",
          redirect: "/auth/signin"
        }, 
        { status: 401 }
      )
    }

    if (!session.user.email) {
      console.log("❌ Session missing email")
      return NextResponse.json(
        { 
          error: "Invalid session - missing email", 
          code: "INVALID_SESSION",
          redirect: "/auth/signin"
        }, 
        { status: 401 }
      )
    }

    // Find user in database
    let user
    try {
      user = await findUserBySession(session)
    } catch (error) {
      console.error("❌ User lookup failed:", error)
      return NextResponse.json(
        { 
          error: "User lookup failed", 
          code: "USER_LOOKUP_FAILED",
          details: "Please sign out and back in",
          redirect: "/auth/signin"
        }, 
        { status: 404 }
      )
    }

    // Verify course exists and is published
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { 
        id: true, 
        title: true, 
        isPublished: true,
        sections: {
          select: {
            id: true,
            order: true,
            videos: {
              select: { id: true, order: true },
              orderBy: { order: 'asc' },
              take: 1
            }
          },
          orderBy: { order: 'asc' },
          take: 1
        },
        videos: {
          select: { id: true, order: true },
          orderBy: { order: 'asc' },
          take: 1
        }
      }
    })

    if (!course) {
      console.log("❌ Course not found:", courseId)
      return NextResponse.json(
        { 
          error: "Course not found", 
          code: "COURSE_NOT_FOUND" 
        }, 
        { status: 404 }
      )
    }

    if (!course.isPublished) {
      console.log("❌ Course not published:", courseId)
      return NextResponse.json(
        { 
          error: "Course is not available", 
          code: "COURSE_NOT_PUBLISHED" 
        }, 
        { status: 403 }
      )
    }

    // Check existing enrollment
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: courseId
        }
      }
    })

    if (existingEnrollment) {
      console.log("✅ User already enrolled:", {
        userId: user.id,
        courseId,
        enrollmentId: existingEnrollment.id
      })

      // Find first video for redirect
      const firstVideo = course.sections[0]?.videos[0] || course.videos[0]
      const redirectPath = firstVideo 
        ? `/course/${courseId}/video/${firstVideo.id}`
        : `/course/${courseId}`

      return NextResponse.json({
        message: "Already enrolled",
        code: "ALREADY_ENROLLED",
        enrollment: existingEnrollment,
        redirect: redirectPath
      })
    }

    // Create new enrollment
    console.log("📝 Creating enrollment:", { userId: user.id, courseId })
    
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: user.id,
        courseId: courseId,
        progress: 0
      }
    })

    console.log("✅ Enrollment created:", enrollment.id)

    // Determine redirect path
    const firstVideo = course.sections[0]?.videos[0] || course.videos[0]
    const redirectPath = firstVideo 
      ? `/course/${courseId}/video/${firstVideo.id}`
      : `/course/${courseId}`

    console.log("🔄 Redirect path:", redirectPath)

    return NextResponse.json({
      message: "Successfully enrolled",
      code: "ENROLLMENT_SUCCESS",
      enrollment,
      redirect: redirectPath
    }, { status: 201 })

  } catch (error: any) {
    console.error("💥 Enrollment error:", error)
    
    return NextResponse.json({
      error: "Failed to enroll in course",
      code: "DATABASE_ERROR",
      details: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
    }, { status: 500 })
  }
}

// Check enrollment status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" }, 
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" }, 
        { status: 401 }
      )
    }

    const user = await findUserBySession(session)

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: courseId
        }
      }
    })

    return NextResponse.json({ 
      enrolled: !!enrollment,
      enrollment: enrollment || null
    })

  } catch (error: any) {
    console.error("Error checking enrollment:", error)
    return NextResponse.json({
      error: "Failed to check enrollment",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}