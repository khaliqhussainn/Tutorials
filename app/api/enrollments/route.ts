// app/api/enrollments/route.ts - COMPLETELY IMPROVED VERSION
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Helper function to find user by multiple methods
async function findUserBySession(session: any) {
  if (!session) {
    throw new Error("No session provided")
  }

  console.log("=== Finding User ===")
  console.log("Session user:", {
    id: session.user?.id,
    email: session.user?.email,
    name: session.user?.name
  })

  let user = null
  let userId = null

  // Method 1: Try session user ID directly
  if (session.user?.id) {
    console.log("Trying to find user by session ID:", session.user.id)
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, role: true }
    })
    if (user) {
      console.log("✅ Found user by session ID")
      return user
    }
  }

  // Method 2: Try by email (most reliable)
  if (session.user?.email) {
    console.log("Trying to find user by email:", session.user.email)
    user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, name: true, role: true }
    })
    if (user) {
      console.log("✅ Found user by email")
      return user
    }
  }

  // Method 3: Create user if not found (for OAuth users)
  if (session.user?.email && !user) {
    console.log("User not found, creating new user...")
    try {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || null,
          role: 'USER',
          // Don't set ID, let Prisma generate it
        },
        select: { id: true, email: true, name: true, role: true }
      })
      console.log("✅ Created new user:", user.id)
      return user
    } catch (createError: any) {
      console.error("Failed to create user:", createError)
      
      // If creation failed due to duplicate, try finding again
      if (createError.code === 'P2002') {
        user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, email: true, name: true, role: true }
        })
        if (user) {
          console.log("✅ Found user after creation attempt")
          return user
        }
      }
      throw new Error(`Failed to create user: ${createError.message}`)
    }
  }

  throw new Error("Could not find or create user")
}

export async function POST(request: Request) {
  try {
    console.log("=== ENROLLMENT REQUEST START ===")
    
    const session = await getServerSession(authOptions)
    console.log("Session exists:", !!session)
    console.log("Session user data:", session?.user)
    
    if (!session || !session.user?.email) {
      console.log("❌ No valid session or email")
      return NextResponse.json({ 
        error: "Authentication required",
        details: "Please sign in to enroll in courses",
        code: "AUTH_REQUIRED"
      }, { status: 401 })
    }

    // Parse request body
    let courseId: string
    try {
      const body = await request.json()
      courseId = body.courseId
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

    console.log("Course ID:", courseId)

    // Step 1: Find or create user
    let user
    try {
      user = await findUserBySession(session)
    } catch (error: any) {
      console.error("❌ User lookup/creation failed:", error.message)
      return NextResponse.json({
        error: "User authentication failed",
        details: "Please try signing out and back in",
        code: "USER_NOT_FOUND"
      }, { status: 401 })
    }

    console.log("✅ User found/created:", user.id)

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

    // Step 4: Create enrollment
    console.log("Creating new enrollment...")
    const enrollment = await prisma.enrollment.create({
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
            },
            _count: {
              select: { enrollments: true }
            }
          }
        }
      }
    })

    // Get the first video for redirect
    const firstVideo = enrollment.course.sections?.[0]?.videos?.[0] || 
                     enrollment.course.videos?.[0]

    console.log("✅ Enrollment created successfully")
    console.log("=== ENROLLMENT REQUEST SUCCESS ===")

    return NextResponse.json({
      message: "Successfully enrolled in course",
      enrollment,
      redirect: firstVideo ? `/course/${courseId}/video/${firstVideo.id}` : `/course/${courseId}`,
      code: "ENROLLMENT_SUCCESS"
    }, { status: 201 })

  } catch (error: any) {
    console.error("=== ENROLLMENT ERROR ===")
    console.error("Error details:", error)
    
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
    
    return NextResponse.json({ 
      error: "Failed to enroll in course",
      details: process.env.NODE_ENV === 'development' 
        ? error.message 
        : "Please try again or contact support",
      code: "ENROLLMENT_FAILED"
    }, { status: 500 })
  }
}