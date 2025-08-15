import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

// app/api/user/favorites/check/route.ts - Check if course is favorited
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

    const favorite = await prisma.favoriteCourse.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId
        }
      }
    })

    return NextResponse.json({
      isFavorited: !!favorite,
      favoriteId: favorite?.id || null
    })
  } catch (error) {
    console.error('Error checking favorite status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
