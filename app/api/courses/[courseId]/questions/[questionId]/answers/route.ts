// app/api/courses/[courseId]/questions/[questionId]/answers/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: Request,
  { params }: { params: { courseId: string; questionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    const { content } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Check if question exists and belongs to the course
    const question = await prisma.courseQuestion.findFirst({
      where: {
        id: params.questionId,
        courseId: params.courseId
      }
    })

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    // Check if user can answer (enrolled students or admins)
    const canAnswer = user.role === 'ADMIN' || await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: params.courseId
        }
      }
    })

    if (!canAnswer) {
      return NextResponse.json({ error: "You must be enrolled in this course to answer questions" }, { status: 403 })
    }

    const answer = await prisma.courseAnswer.create({
      data: {
        questionId: params.questionId,
        userId: user.id,
        content: content.trim(),
        isCorrect: user.role === 'ADMIN' // Admin answers are marked as correct by default
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, role: true }
        }
      }
    })

    // Update question answered status if this is the first answer
    await prisma.courseQuestion.update({
      where: { id: params.questionId },
      data: { isAnswered: true }
    })

    return NextResponse.json({
      success: true,
      answer
    })
  } catch (error) {
    console.error("Error creating answer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// app/api/courses/[courseId]/questions/[questionId]/answers/[answerId]/route.ts
export async function PATCH(
  request: Request,
  { params }: { params: { courseId: string; questionId: string; answerId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { isCorrect } = body

    const updatedAnswer = await prisma.courseAnswer.update({
      where: { id: params.answerId },
      data: { isCorrect: Boolean(isCorrect) },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, role: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      answer: updatedAnswer
    })
  } catch (error) {
    console.error("Error updating answer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}