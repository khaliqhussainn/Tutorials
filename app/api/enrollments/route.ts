// app/api/enrollments/route.ts - PRODUCTION FIXED VERSION
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Helper function to find user consistently
async function findUserBySession(session: any) {
  if (!session?.user) {
    throw new Error("No session user provided")
  }

  console.log("=== Finding User ===")
  console.log("Session user:", {
    id: session.user?.id,
    email: session.user?.email,
    name: session.user?.name
  })

  // Method 1: Try session user ID directly
  if (session.user.id) {
    console.log("Trying to find user by session ID:", session.user.id)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, role: true }
    })
    if (user) {
      console.log("✅ Found user by session ID:", user.id)
      return user
    }
  }

  // Method 2: Try by email (most reliable for OAuth)
  if (session.user.email) {
    console.log("Trying to find user by email:", session.user.email)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, name: true, role: true }
    })
    if (user) {
      console.log("✅ Found user by email:", user.id)
      return user
    }
  }

  throw new Error(`User not found. Session ID: ${session.user.id}, Email: ${session.user.email}`)
}

export async function POST(request: Request) {
  try {
    console.log("=== ENROLLMENT REQUEST START ===")
    
    // Get session with explicit options
    const session = await getServerSession(authOptions)
    
    console.log("Raw session:", JSON.stringify({
      exists: !!session,
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      } : null
    }, null, 2))
    
    if (!session?.user) {
      console.log("❌ No session found")
      return NextResponse.json({ 
        error: "Authentication required",
        details: "Please sign in to enroll in courses",
        code: "AUTH_REQUIRED"
      }, { status: 401 })
    }

    if (!session.user.email) {
      console.log("❌ No email in session")
      return NextResponse.json({ 
        error: "Invalid session",
        details: "Session missing email. Please sign out and back in.",
        code: "INVALID_SESSION"
      }, { status: 401 })
    }

    // Parse request body
    let courseId: string
    try {
      const body = await request.json()
      courseId = body.courseId
      console.log("Course ID:", courseId)
    } catch (error) {
      console.log("❌ Invalid request body")
      return NextResponse.json({ 
        error: "Invalid request body",
        details: "courseId is required"
      }, { status: 400 })
    }

    if (!courseId) {
      return NextResponse.json({ 
        error: "Course ID is required" 
      }, { status: 400 })
    }

    // Step 1: Find user with retry logic
    let user
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        user = await findUserBySession(session)
        break
      } catch (error: any) {
        retryCount++
        console.error(`❌ User lookup attempt ${retryCount} failed:`, error.message)
        
        if (retryCount >= maxRetries) {
          console.error("❌ All user lookup attempts failed")
          return NextResponse.json({
            error: "User authentication failed",
            details: "Unable to verify your account. Please sign out and back in.",
            code: "USER_LOOKUP_FAILED"
          }, { status: 401 })
        }
        
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log("✅ User verified:", user.id)

    // Step 2: Verify course exists and is published
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { 
        id: true, 
        title: true,
        isPublished: true,
        sections: {
          select: {
            videos: {
              select: { id: true },
              orderBy: { order: 'asc' },
              take: 1
            }
          },
          orderBy: { order: 'asc' },
          take: 1
        },
        videos: {
          select: { id: true },
          orderBy: { order: 'asc' },
          take: 1
        }
      }
    })

    if (!course) {
      console.log("❌ Course not found")
      return NextResponse.json({ 
        error: "Course not found",
        code: "COURSE_NOT_FOUND"
      }, { status: 404 })
    }

    if (!course.isPublished) {
      console.log("❌ Course not published")
      return NextResponse.json({ 
        error: "Course is not available for enrollment",
        code: "COURSE_NOT_PUBLISHED"
      }, { status: 400 })
    }

    console.log("✅ Course verified:", course.title)

    // Step 3: Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: courseId
        }
      }
    })

    if (existingEnrollment) {
      console.log("✅ Already enrolled, returning existing enrollment")
      
      // Get first video for redirect
      const firstVideo = course.sections?.[0]?.videos?.[0] || course.videos?.[0]
      
      return NextResponse.json({ 
        message: "Already enrolled in this course",
        enrollment: existingEnrollment,
        redirect: firstVideo ? `/course/${courseId}/video/${firstVideo.id}` : `/course/${courseId}`,
        code: "ALREADY_ENROLLED"
      }, { status: 200 })
    }

    // Step 4: Create enrollment with transaction for data consistency
    console.log("Creating new enrollment...")
    
    const result = await prisma.$transaction(async (tx) => {
      // Double-check user exists in transaction
      const txUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { id: true }
      })
      
      if (!txUser) {
        throw new Error("User not found in transaction")
      }
      
      // Create enrollment
      const enrollment = await tx.enrollment.create({
        data: {
          userId: user.id,
          courseId: courseId
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              sections: {
                select: {
                  videos: {
                    select: { id: true },
                    orderBy: { order: 'asc' },
                    take: 1
                  }
                },
                orderBy: { order: 'asc' },
                take: 1
              },
              videos: {
                select: { id: true },
                orderBy: { order: 'asc' },
                take: 1
              }
            }
          }
        }
      })
      
      return enrollment
    })

    // Get the first video for redirect
    const firstVideo = result.course.sections?.[0]?.videos?.[0] || 
                     result.course.videos?.[0]

    console.log("✅ Enrollment created successfully")
    console.log("=== ENROLLMENT REQUEST SUCCESS ===")

    return NextResponse.json({
      message: "Successfully enrolled in course",
      enrollment: result,
      redirect: firstVideo ? `/course/${courseId}/video/${firstVideo.id}` : `/course/${courseId}`,
      code: "ENROLLMENT_SUCCESS"
    }, { status: 201 })

  } catch (error: any) {
    console.error("=== ENROLLMENT ERROR ===")
    console.error("Error details:", error)
    console.error("Stack trace:", error.stack)
    
    // Handle specific Prisma errors
    if (error.code === 'P2003') {
      return NextResponse.json({ 
        error: "Database constraint error",
        details: "Invalid user or course reference",
        code: "CONSTRAINT_ERROR"
      }, { status: 400 })
    }
    
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: "Already enrolled",
        details: "You are already enrolled in this course",
        code: "DUPLICATE_ENROLLMENT"
      }, { status: 400 })
    }

    // Handle database connection errors
    if (error.message?.includes('database') || error.code?.startsWith('P')) {
      return NextResponse.json({ 
        error: "Database connection error",
        details: "Please try again in a moment",
        code: "DATABASE_ERROR"
      }, { status: 503 })
    }
    
    return NextResponse.json({ 
      error: "Failed to enroll in course",
      details: process.env.NODE_ENV === 'development' 
        ? error.message 
        : "Please try again or contact support",
      code: "ENROLLMENT_FAILED"
    }, { status: 500 })
  }
}