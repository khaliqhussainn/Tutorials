// app/api/courses/route.ts - Fixed with better error handling
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const level = searchParams.get('level')
    
    const courses = await prisma.course.findMany({
      where: {
        isPublished: true,
        ...(category && { category }),
        ...(level && { level: level as any }),
      },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            videos: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                duration: true,
                tests: { select: { id: true } }
              }
            }
          }
        },
        videos: {
          where: { sectionId: null },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            duration: true,
            tests: { select: { id: true } }
          }
        },
        _count: {
          select: {
            enrollments: true,
          }
        }
      }
    })

    return NextResponse.json(courses)
  } catch (error) {
    console.error("Error fetching courses:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const data = await request.json()
    
    const course = await prisma.course.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        level: data.level,
        thumbnail: data.thumbnail,
      }
    })

    return NextResponse.json(course)
  } catch (error) {
    console.error("Error creating course:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}