// app/api/user/progress/route.ts
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

    // Get user's progress for courses where they have some progress but haven't completed
    const enrollmentsWithProgress = await prisma.enrollment.findMany({
      where: { 
        userId: user.id,
        progress: {
          gt: 0,
          lt: 100
        }
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnail: true,
            category: true,
            level: true,
            videos: {
              select: { duration: true },
              orderBy: { order: 'asc' }
            },
            sections: {
              select: {
                videos: {
                  select: { duration: true },
                  orderBy: { order: 'asc' }
                }
              },
              orderBy: { order: 'asc' }
            },
            _count: {
              select: { enrollments: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Transform the data to match the expected interface
    const userProgress = enrollmentsWithProgress.map(enrollment => ({
      courseId: enrollment.courseId,
      progress: enrollment.progress,
      lastWatched: enrollment.updatedAt.toISOString(),
      course: {
        ...enrollment.course,
        videos: [
          ...enrollment.course.videos,
          ...enrollment.course.sections.flatMap(section => section.videos)
        ]
      }
    }))

    // Remove sections from the response to avoid confusion
    const finalProgress = userProgress.map(item => ({
      courseId: item.courseId,
      progress: item.progress,
      lastWatched: item.lastWatched,
      course: {
        id: item.course.id,
        title: item.course.title,
        description: item.course.description,
        thumbnail: item.course.thumbnail,
        category: item.course.category,
        level: item.course.level,
        videos: item.course.videos,
        _count: item.course._count
      }
    }))

    return NextResponse.json(finalProgress)

  } catch (error: any) {
    console.error("Error fetching user progress:", error)
    
    if (error.message === "User not found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
    return NextResponse.json({ 
      error: "Failed to fetch progress",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}