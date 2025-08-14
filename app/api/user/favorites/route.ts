// app/api/user/favorites/route.ts - Enhanced favorites system
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const favorites = await prisma.favoriteCourse.findMany({
      where: { userId: session.user.id },
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
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(favorites)
  } catch (error) {
    console.error("Error fetching favorites:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseId } = await request.json()

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Check if already favorited
    const existingFavorite = await prisma.favoriteCourse.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId
        }
      }
    })

    if (existingFavorite) {
      return NextResponse.json({ error: "Already favorited" }, { status: 400 })
    }

    const favorite = await prisma.favoriteCourse.create({
      data: {
        userId: session.user.id,
        courseId
      },
      include: {
        course: true
      }
    })

    return NextResponse.json(favorite)
  } catch (error) {
    console.error("Error adding favorite:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseId } = await request.json()

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    await prisma.favoriteCourse.deleteMany({
      where: {
        userId: session.user.id,
        courseId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing favorite:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
