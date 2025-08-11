// app/api/admin/courses/[courseId]/duplicate/route.ts
import { NextRequest, NextResponse } from "next/server"

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    // Validate environment
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL not found")
      return NextResponse.json({ error: "Database configuration missing" }, { status: 500 })
    }

    // Validate params
    const courseId = params?.courseId
    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // Dynamic imports with individual error handling
    let getServerSession, authOptions, prisma

    try {
      const nextAuthModule = await import("next-auth")
      getServerSession = nextAuthModule.getServerSession
    } catch (error) {
      console.error("Failed to import next-auth:", error)
      return NextResponse.json({ error: "Authentication service unavailable" }, { status: 500 })
    }

    try {
      const authModule = await import("@/lib/auth")
      authOptions = authModule.authOptions
    } catch (error) {
      console.error("Failed to import auth options:", error)
      return NextResponse.json({ error: "Authentication configuration missing" }, { status: 500 })
    }

    try {
      const prismaModule = await import("@/lib/prisma")
      prisma = prismaModule.prisma
    } catch (error) {
      console.error("Failed to import prisma:", error)
      return NextResponse.json({ error: "Database service unavailable" }, { status: 500 })
    }

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get original course with error handling
    let originalCourse
    try {
      originalCourse = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
          id: true,
          title: true,
          description: true,
          thumbnail: true,
          category: true,
          level: true,
        }
      })
    } catch (error) {
      console.error("Database query failed:", error)
      return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 })
    }

    if (!originalCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Create duplicate with error handling
    let duplicatedCourse
    try {
      duplicatedCourse = await prisma.course.create({
        data: {
          title: `${originalCourse.title} (Copy)`,
          description: originalCourse.description,
          thumbnail: originalCourse.thumbnail,
          category: originalCourse.category,
          level: originalCourse.level,
          isPublished: false,
        },
        select: {
          id: true,
          title: true,
          description: true,
          thumbnail: true,
          category: true,
          level: true,
          isPublished: true,
          createdAt: true,
          updatedAt: true,
        }
      })
    } catch (error) {
      console.error("Failed to create duplicate:", error)
      return NextResponse.json({ error: "Failed to create duplicate course" }, { status: 500 })
    }

    // Return response with minimal structure expected by frontend
    return NextResponse.json({
      ...duplicatedCourse,
      videos: [],
      sections: [],
      _count: { enrollments: 0 }
    })

  } catch (error) {
    console.error("Unexpected error in duplicate route:", error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    )
  }
}