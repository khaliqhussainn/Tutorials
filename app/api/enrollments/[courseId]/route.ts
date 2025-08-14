// app/api/enrollments/[courseId]/route.ts - FIXED
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log("=== ENROLLMENT CHECK ===")
    console.log("Session found:", !!session)
    console.log("Course ID:", params.courseId)
    console.log("Session user ID:", session?.user?.id)
    
    if (!session?.user?.id || !session?.user?.email) {
      console.log("No session or user data found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use the same user lookup logic as enrollment
    let userId = session.user.id
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    console.log("User found by session ID:", !!user)

    // If user not found by session ID, try by email
    if (!user && session.user.email) {
      console.log("Trying to find user by email...")
      const userByEmail = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      })
      
      if (userByEmail) {
        console.log("User found by email, using ID:", userByEmail.id)
        userId = userByEmail.id
        user = userByEmail
      }
    }

    if (!user) {
      console.log("User not found in database")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: userId,
          courseId: params.courseId
        }
      }
    })

    console.log("Enrollment found:", !!enrollment)

    if (enrollment) {
      return NextResponse.json(enrollment)
    } else {
      return NextResponse.json({ error: "Not enrolled" }, { status: 404 })
    }
  } catch (error) {
    console.error("Error checking enrollment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}