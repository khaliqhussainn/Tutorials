// app/api/enrollments/[courseId]/route.ts - PRODUCTION FIXED
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    console.log("=== ENROLLMENT CHECK START ===")
    console.log("Course ID:", params.courseId)
    
    const session = await getServerSession(authOptions)
    
    console.log("Session found:", !!session)
    console.log("Session user:", session?.user ? {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name
    } : null)
    
    if (!session?.user) {
      console.log("No session or user data found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use consistent user lookup logic
    let userId = session.user.id
    let user = null

    // Method 1: Try by session ID
    if (userId) {
      console.log("Looking up user by session ID:", userId)
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true }
      })
      console.log("User found by session ID:", !!user)
    }

    // Method 2: Try by email if session ID failed
    if (!user && session.user.email) {
      console.log("Looking up user by email:", session.user.email)
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true }
      })
      
      if (user) {
        console.log("User found by email, using ID:", user.id)
        userId = user.id
      }
    }

    if (!user) {
      console.log("User not found in database")
      return NextResponse.json({ 
        error: "User not found",
        details: "Please sign out and back in" 
      }, { status: 404 })
    }

    console.log("Final user ID:", userId)

    // Check enrollment with retry logic for production stability
    let enrollment = null
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries && !enrollment) {
      try {
        enrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: userId,
              courseId: params.courseId
            }
          },
          select: {
            id: true,
            userId: true,
            courseId: true,
            progress: true,
            enrolledAt: true,
            updatedAt: true,
            completedAt: true
          }
        })
        break
      } catch (dbError: any) {
        retryCount++
        console.error(`Database query attempt ${retryCount} failed:`, dbError.message)
        
        if (retryCount >= maxRetries) {
          throw dbError
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log("Enrollment found:", !!enrollment)

    if (enrollment) {
      console.log("✅ Enrollment check successful")
      return NextResponse.json(enrollment)
    } else {
      console.log("❌ Not enrolled")
      return NextResponse.json({ error: "Not enrolled" }, { status: 404 })
    }
    
  } catch (error: any) {
    console.error("=== ENROLLMENT CHECK ERROR ===")
    console.error("Error details:", error)
    
    // Handle specific database errors
    if (error.message?.includes('database') || error.code?.startsWith('P')) {
      return NextResponse.json({ 
        error: "Database connection error",
        details: "Please try again in a moment" 
      }, { status: 503 })
    }
    
    return NextResponse.json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : "Please try again"
    }, { status: 500 })
  }
}