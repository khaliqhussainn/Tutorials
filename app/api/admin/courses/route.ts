import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

// app/api/admin/courses/route.ts - Enhanced to get all courses for admin
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const courses = await prisma.course.findMany({
      include: {
        sections: {
          include: {
            videos: {
              select: {
                id: true,
                duration: true
              }
            }
          }
        },
        videos: {
          where: { sectionId: null },
          select: {
            id: true,
            duration: true
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Add computed fields for easier frontend usage
    const enhancedCourses = courses.map(course => ({
      ...course,
      totalVideos: course.sections.reduce((acc, section) => acc + section.videos.length, 0) + course.videos.length,
      totalDuration: [
        ...course.sections.flatMap(section => section.videos),
        ...course.videos
      ].reduce((acc, video) => acc + (video.duration || 0), 0)
    }))

    console.log(`Fetched ${enhancedCourses.length} courses for admin`)

    return NextResponse.json(enhancedCourses)
  } catch (error) {
    console.error("Error fetching admin courses:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()
    
    const course = await prisma.course.create({
      data: {
        ...data,
        isPublished: data.isPublished || false
      },
      include: {
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    })

    console.log(`Course "${course.title}" created by admin ${session.user.email}`)

    return NextResponse.json(course)
  } catch (error) {
    console.error("Error creating course:", error)
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 })
  }
}