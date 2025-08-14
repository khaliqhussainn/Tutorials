// app/api/courses/route.ts - Enhanced with better filtering and category support
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const level = searchParams.get('level')
    const featured = searchParams.get('featured')
    const search = searchParams.get('search')
    
    const courses = await prisma.course.findMany({
      where: {
        isPublished: true,
        ...(category && category !== 'All' && { category }),
        ...(level && level !== 'All' && { level: level as any }),
        ...(featured === 'true' && { isFeatured: true }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } }
          ]
        })
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
            favoritedBy: true
          }
        }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
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
        price: data.price || 0,
        isFree: data.isFree !== false,
        isFeatured: data.isFeatured || false
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
