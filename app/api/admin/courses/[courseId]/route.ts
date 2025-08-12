// app/api/admin/courses/[courseId]/route.ts - FIXED to allow admin deletion
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            videos: {
              orderBy: { order: 'asc' },
              include: {
                tests: { 
                  select: { 
                    id: true, 
                    question: true, 
                    options: true, 
                    correct: true,
                    explanation: true,
                    difficulty: true 
                  } 
                }
              }
            }
          }
        },
        videos: {
          where: { sectionId: null },
          orderBy: { order: 'asc' },
          include: {
            tests: { 
              select: { 
                id: true, 
                question: true, 
                options: true, 
                correct: true,
                explanation: true,
                difficulty: true 
              } 
            }
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    return NextResponse.json(course)
  } catch (error) {
    console.error("Error fetching course:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()

    const updatedCourse = await prisma.course.update({
      where: { id: params.courseId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(updatedCourse)
  } catch (error) {
    console.error("Error updating course:", error)
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`Admin ${session.user.email} attempting to delete course ${params.courseId}`)

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        _count: {
          select: {
            enrollments: true,
            sections: true,
            videos: true
          }
        }
      }
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    console.log(`Course "${course.title}" found with:`, {
      enrollments: course._count.enrollments,
      sections: course._count.sections,
      videos: course._count.videos
    })

    // Admin can delete any course - perform cascade deletion
    try {
      // Use transaction to ensure all related data is deleted properly
      await prisma.$transaction(async (tx) => {
        // 1. Delete quiz attempts first (they reference video progress and videos)
        await tx.quizAttempt.deleteMany({
          where: {
            video: {
              courseId: params.courseId
            }
          }
        })

        // 2. Delete video notes
        await tx.videoNote.deleteMany({
          where: {
            video: {
              courseId: params.courseId
            }
          }
        })

        // 3. Delete video progress
        await tx.videoProgress.deleteMany({
          where: {
            video: {
              courseId: params.courseId
            }
          }
        })

        // 4. Delete tests (they reference videos)
        await tx.test.deleteMany({
          where: {
            video: {
              courseId: params.courseId
            }
          }
        })

        // 5. Delete videos (both sectioned and non-sectioned)
        await tx.video.deleteMany({
          where: {
            courseId: params.courseId
          }
        })

        // 6. Delete course sections
        await tx.courseSection.deleteMany({
          where: {
            courseId: params.courseId
          }
        })

        // 7. Delete enrollments
        await tx.enrollment.deleteMany({
          where: {
            courseId: params.courseId
          }
        })

        // 8. Finally delete the course
        await tx.course.delete({
          where: { id: params.courseId }
        })
      })

      console.log(`Course "${course.title}" and all related data deleted successfully`)

      return NextResponse.json({ 
        success: true, 
        message: `Course "${course.title}" deleted successfully`,
        deletedData: {
          enrollments: course._count.enrollments,
          sections: course._count.sections,
          videos: course._count.videos
        }
      })

    } catch (transactionError) {
      console.error("Transaction error during course deletion:", transactionError)
      throw transactionError
    }

  } catch (error) {
    console.error("Error deleting course:", error)
    
    // Check if it's a foreign key constraint error
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 'P2003') {
      return NextResponse.json({ 
        error: "Cannot delete course due to database constraints. Please contact support." 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: "Failed to delete course. Please try again." 
    }, { status: 500 })
  }
}
