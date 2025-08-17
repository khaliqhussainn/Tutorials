// app/api/user/enrollments/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Helper function to find user consistently
async function findUserBySession(session: any) {
  if (!session?.user) {
    throw new Error("No session user provided")
  }

  let userId = session.user.id
  let user = null

  // Method 1: Try by session ID
  if (userId) {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })
    if (user) return user
  }

  // Method 2: Try by email
  if (session.user.email) {
    user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })
    if (user) return user
  }

  throw new Error("User not found")
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await findUserBySession(session)

    // Get user's enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        courseId: true,
        progress: true,
        enrolledAt: true,
        updatedAt: true,
        completedAt: true
      },
      orderBy: { enrolledAt: 'desc' }
    })

    return NextResponse.json(enrollments)

  } catch (error: any) {
    console.error("Error fetching user enrollments:", error)
    
    if (error.message === "User not found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
    return NextResponse.json({ 
      error: "Failed to fetch enrollments",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}