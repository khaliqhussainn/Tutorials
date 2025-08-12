// app/api/enrollments/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log("Enrollment POST - Session:", session) // Debug log
    
    if (!session?.user?.id) {
      console.log("No session or user ID found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("User ID from session:", session.user.id) // Debug log

    // Verify the user exists in the database
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true }
    })

    console.log("User found in DB:", userExists) // Debug log

    if (!userExists) {
      console.error("User not found in database:", session.user.id)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { courseId } = await request.json()
    console.log("Course ID to enroll in:", courseId) // Debug log

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // Check if course exists and is published
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    })

    console.log("Course found:", course?.title, "Published:", course?.isPublished) // Debug log

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    if (!course.isPublished) {
      return NextResponse.json({ error: "Course is not published" }, { status: 400 })
    }

    // Check if user is already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: courseId
        }
      }
    })

    if (existingEnrollment) {
      console.log("User already enrolled")
      return NextResponse.json({ error: "Already enrolled" }, { status: 400 })
    }

    // Create enrollment
    console.log("Creating enrollment...")
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: session.user.id,
        courseId: courseId
      }
    })

    console.log("Enrollment created successfully:", enrollment.id)
    return NextResponse.json(enrollment)
  } catch (error) {
    console.error("Error creating enrollment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}