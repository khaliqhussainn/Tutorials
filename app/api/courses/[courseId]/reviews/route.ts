// app/api/courses/[courseId]/reviews/route.ts
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
    const rating = searchParams.get('rating') // Filter by rating
    const sortBy = searchParams.get('sortBy') || 'newest' // newest, oldest, rating_high, rating_low, helpful

    const skip = (page - 1) * limit

    const whereClause: any = {
      courseId: params.courseId,
      isPublic: true
    }

    if (rating && rating !== 'all') {
      whereClause.rating = parseInt(rating)
    }

    let orderBy: any = { createdAt: 'desc' } // default

    switch (sortBy) {
      case 'oldest':
        orderBy = { createdAt: 'asc' }
        break
      case 'rating_high':
        orderBy = [{ rating: 'desc' }, { createdAt: 'desc' }]
        break
      case 'rating_low':
        orderBy = [{ rating: 'asc' }, { createdAt: 'desc' }]
        break
      case 'helpful':
        orderBy = [{ helpfulCount: 'desc' }, { createdAt: 'desc' }]
        break
    }

    const [reviews, total, ratingStats] = await Promise.all([
      prisma.courseReview.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, name: true, image: true }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.courseReview.count({ where: whereClause }),
      prisma.courseReview.groupBy({
        by: ['rating'],
        where: {
          courseId: params.courseId,
          isPublic: true
        },
        _count: { rating: true }
      })
    ])

    // Calculate average rating and rating distribution
    const totalReviews = ratingStats.reduce((acc, stat) => acc + stat._count.rating, 0)
    const averageRating = totalReviews > 0 
      ? ratingStats.reduce((acc, stat) => acc + (stat.rating * stat._count.rating), 0) / totalReviews
      : 0

    const ratingDistribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    }
    
    ratingStats.forEach(stat => {
      ratingDistribution[stat.rating as keyof typeof ratingDistribution] = stat._count.rating
    })

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        averageRating: Number(averageRating.toFixed(1)),
        totalReviews,
        ratingDistribution
      }
    })
  } catch (error) {
    console.error("Error fetching reviews:", error)
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
    const { rating, title, comment } = body

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
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
      return NextResponse.json({ error: "You must be enrolled in this course to leave a review" }, { status: 403 })
    }

    // Check if user already reviewed this course
    const existingReview = await prisma.courseReview.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: params.courseId
        }
      }
    })

    if (existingReview) {
      // Update existing review
      const updatedReview = await prisma.courseReview.update({
        where: { id: existingReview.id },
        data: {
          rating,
          title: title?.trim(),
          comment: comment?.trim(),
          updatedAt: new Date()
        },
        include: {
          user: {
            select: { id: true, name: true, image: true }
          }
        }
      })

      return NextResponse.json({
        success: true,
        review: updatedReview,
        message: "Review updated successfully"
      })
    } else {
      // Create new review
      const newReview = await prisma.courseReview.create({
        data: {
          userId: user.id,
          courseId: params.courseId,
          rating,
          title: title?.trim(),
          comment: comment?.trim()
        },
        include: {
          user: {
            select: { id: true, name: true, image: true }
          }
        }
      })

      // Update course rating
      const allReviews = await prisma.courseReview.findMany({
        where: {
          courseId: params.courseId,
          isPublic: true
        },
        select: { rating: true }
      })

      if (allReviews.length > 0) {
        const averageRating = allReviews.reduce((acc, review) => acc + review.rating, 0) / allReviews.length
        await prisma.course.update({
          where: { id: params.courseId },
          data: { rating: Math.round(averageRating * 10) / 10 }
        })
      }

      return NextResponse.json({
        success: true,
        review: newReview,
        message: "Review created successfully"
      })
    }
  } catch (error) {
    console.error("Error creating/updating review:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
