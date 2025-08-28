// app/api/courses/[courseId]/questions/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all' // all, answered, unanswered

    const skip = (page - 1) * limit

    const whereClause: any = {
      courseId: params.courseId,
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (filter === 'answered') {
      whereClause.isAnswered = true
    } else if (filter === 'unanswered') {
      whereClause.isAnswered = false
    }

    const [questions, total] = await Promise.all([
      prisma.courseQuestion.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true }
          },
          answers: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true, role: true }
              }
            },
            orderBy: [
              { isCorrect: 'desc' },
              { upvotes: 'desc' },
              { createdAt: 'asc' }
            ]
          },
          _count: {
            select: { answers: true }
          }
        },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.courseQuestion.count({ where: whereClause })
    ])

    return NextResponse.json({
      questions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching questions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    const { title, content } = body

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    // Check if user is enrolled in the course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: params.courseId
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ error: "You must be enrolled in this course to ask questions" }, { status: 403 })
    }

    const question = await prisma.courseQuestion.create({
      data: {
        courseId: params.courseId,
        userId: user.id,
        title: title.trim(),
        content: content.trim()
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        },
        _count: {
          select: { answers: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      question
    })
  } catch (error) {
    console.error("Error creating question:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}