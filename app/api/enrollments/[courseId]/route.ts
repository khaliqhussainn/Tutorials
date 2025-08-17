// app/api/enrollments/[courseId]/route.ts - PRODUCTION FIXED
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Enhanced user lookup function
async function findUserBySession(session: any) {
  if (!session?.user) {
    throw new Error("No session user provided")
  }

  let user = null

  // Method 1: Try by session ID
  if (session.user.id) {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true }
    })
    if (user) return user
  }

  // Method 2: Try by email
  if (session.user.email) {
    user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true }
    })
    if (user) return user
  }

  throw new Error("User not found")
}

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const courseId = params.courseId

    console.log("🔍 Checking enrollment for course:", courseId)

    // Get session
    const session = await getServerSession(authOptions)
    
    console.log("🔐 Session check:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      userId: session?.user?.id
    })

    if (!session?.user) {
      console.log("❌ No session found")
      return NextResponse.json(
        { 
          error: "Authentication required",
          enrolled: false 
        }, 
        { status: 401 }
      )
    }

    // Find user
    let user
    try {
      user = await findUserBySession(session)
      console.log("✅ User found:", user.id)
    } catch (error) {
      console.error("❌ User lookup failed:", error)
      return NextResponse.json(
        { 
          error: "User not found",
          enrolled: false 
        }, 
        { status: 404 }
      )
    }

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: courseId
        }
      },
      select: {
        id: true,
        progress: true,
        enrolledAt: true,
        completedAt: true
      }
    })

    console.log("📊 Enrollment check result:", {
      userId: user.id,
      courseId,
      enrolled: !!enrollment,
      enrollmentId: enrollment?.id
    })

    if (enrollment) {
      return NextResponse.json({
        enrolled: true,
        enrollment
      })
    } else {
      return NextResponse.json({
        enrolled: false,
        enrollment: null
      })
    }

  } catch (error: any) {
    console.error("💥 Enrollment check error:", error)
    
    return NextResponse.json({
      error: "Failed to check enrollment status",
      enrolled: false,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}