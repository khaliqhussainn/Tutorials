// app/api/user/favorites/route.ts - Enhanced version
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get search and filter parameters
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const level = url.searchParams.get('level')
    const search = url.searchParams.get('search')

    // Build where conditions
    const whereConditions: any = {
      userId: user.id,
    }

    if (category && category !== 'all') {
      whereConditions.course = {
        category: category
      }
    }

    if (level && level !== 'all') {
      whereConditions.course = {
        ...whereConditions.course,
        level: level
      }
    }

    if (search) {
      whereConditions.course = {
        ...whereConditions.course,
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }
    }

    const favorites = await prisma.favoriteCourse.findMany({
      where: whereConditions,
      include: {
        course: {
          include: {
            videos: { 
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
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(favorites)
  } catch (error) {
    console.error('Error fetching favorites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { courseId } = body

    if (!courseId || typeof courseId !== 'string') {
      return NextResponse.json({ error: 'Valid course ID is required' }, { status: 400 })
    }

    // Check if course exists and is published
    const course = await prisma.course.findFirst({
      where: { 
        id: courseId,
        isPublished: true
      }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found or not available' }, { status: 404 })
    }

    // Check if already favorited
    const existingFavorite = await prisma.favoriteCourse.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId
        }
      }
    })

    if (existingFavorite) {
      return NextResponse.json({ 
        error: 'Course is already in your favorites',
        isFavorited: true 
      }, { status: 409 })
    }

    // Add to favorites
    const favorite = await prisma.favoriteCourse.create({
      data: {
        userId: user.id,
        courseId
      },
      include: {
        course: {
          include: {
            videos: { 
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
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Course added to favorites successfully',
      favorite
    }, { status: 201 })
  } catch (error) {
    console.error('Error adding favorite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { courseId } = body

    if (!courseId || typeof courseId !== 'string') {
      return NextResponse.json({ error: 'Valid course ID is required' }, { status: 400 })
    }

    // Check if favorite exists
    const existingFavorite = await prisma.favoriteCourse.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId
        }
      }
    })

    if (!existingFavorite) {
      return NextResponse.json({ 
        error: 'Course is not in your favorites',
        isFavorited: false 
      }, { status: 404 })
    }

    // Remove from favorites
    await prisma.favoriteCourse.delete({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId
        }
      }
    })

    return NextResponse.json({
      message: 'Course removed from favorites successfully',
      success: true
    })
  } catch (error) {
    console.error('Error removing favorite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}