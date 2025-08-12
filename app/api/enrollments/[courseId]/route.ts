// app/api/enrollments/[courseId]/route.ts
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
    
    console.log("Enrollment check - Session:", session) // Debug log
    console.log("Checking enrollment for course:", params.courseId) // Debug log
    
    if (!session?.user?.id) {
      console.log("No session found for enrollment check")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: params.courseId
        }
      }
    })

    console.log("Enrollment found:", !!enrollment) // Debug log

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