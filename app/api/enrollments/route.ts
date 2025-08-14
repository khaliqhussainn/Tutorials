// app/api/enrollments/route.ts - COMPLETELY FIXED
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    console.log("=== ENROLLMENT ATTEMPT START ===")
    
    const session = await getServerSession(authOptions)
    console.log("Session found:", !!session)
    console.log("Session user ID:", session?.user?.id)
    console.log("Session user email:", session?.user?.email)
    
    if (!session?.user?.id || !session?.user?.email) {
      console.log("ERROR: No session or missing user data")
      return NextResponse.json({ 
        error: "Unauthorized - Please sign in first" 
      }, { status: 401 })
    }

    const { courseId } = await request.json()
    console.log("Course ID:", courseId)

    if (!courseId) {
      return NextResponse.json({ 
        error: "Course ID is required" 
      }, { status: 400 })
    }

    // Step 1: Find the correct user ID
    let userId = session.user.id
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true }
    })

    console.log("User found by session ID:", !!user)

    // If user not found by session ID, try by email
    if (!user && session.user.email) {
      console.log("User not found by ID, trying by email...")
      const userByEmail = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true, name: true }
      })
      
      if (userByEmail) {
        console.log("User found by email, using correct ID:", userByEmail.id)
        userId = userByEmail.id
        user = userByEmail
      }
    }

    // If still no user, create one (this handles cases where NextAuth session exists but user wasn't created)
    if (!user) {
      console.log("User doesn't exist, creating new user...")
      try {
        user = await prisma.user.create({
          data: {
            id: session.user.id, // Use the session ID
            email: session.user.email,
            name: session.user.name || null,
            role: 'USER'
          },
          select: { id: true, email: true, name: true }
        })
        userId = user.id
        console.log("New user created:", user.id)
      } catch (createError) {
        console.error("Failed to create user:", createError)
        return NextResponse.json({ 
          error: "Failed to create user account",
          details: "Please contact support"
        }, { status: 500 })
      }
    }

    console.log("Final user ID:", userId)

    // Step 2: Verify course exists and is published
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isPublished: true, title: true }
    })

    console.log("Course found:", !!course)
    console.log("Course published:", course?.isPublished)

    if (!course) {
      return NextResponse.json({ 
        error: "Course not found" 
      }, { status: 404 })
    }

    if (!course.isPublished) {
      return NextResponse.json({ 
        error: "Course is not available for enrollment" 
      }, { status: 400 })
    }

    // Step 3: Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: userId,
          courseId: courseId
        }
      }
    })

    console.log("Already enrolled:", !!existingEnrollment)

    if (existingEnrollment) {
      return NextResponse.json({ 
        message: "Already enrolled in this course",
        enrollment: existingEnrollment 
      }, { status: 200 })
    }

    // Step 4: Create enrollment
    console.log("Creating enrollment...")
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: userId,
        courseId: courseId
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            _count: {
              select: { enrollments: true }
            }
          }
        }
      }
    })

    console.log("Enrollment created successfully:", enrollment.id)
    console.log("=== ENROLLMENT ATTEMPT SUCCESS ===")

    return NextResponse.json({
      message: "Successfully enrolled in course",
      enrollment
    })

  } catch (error) {
    console.error("=== ENROLLMENT ERROR ===")
    console.error("Error:", error)
    
    // Handle Prisma foreign key constraint errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2003') {
        return NextResponse.json({ 
          error: "Database constraint error",
          details: "User or course reference is invalid. Please try signing out and back in."
        }, { status: 400 })
      }
      if (error.code === 'P2002') {
        return NextResponse.json({ 
          error: "Already enrolled",
          details: "You are already enrolled in this course"
        }, { status: 400 })
      }
    }
    
    return NextResponse.json({ 
      error: "Failed to enroll in course",
      details: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : "Unknown error")
        : "Please try again or contact support"
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use the same user lookup logic
    let userId = session.user.id
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!user && session.user.email) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      })
      if (userByEmail) {
        userId = userByEmail.id
      }
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: userId },
      include: {
        course: {
          include: {
            sections: {
              include: {
                videos: {
                  select: { id: true, duration: true }
                }
              }
            },
            videos: {
              select: { id: true, duration: true }
            },
            _count: {
              select: { enrollments: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json(enrollments)
  } catch (error) {
    console.error("Error fetching enrollments:", error)
    return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 })
  }
}