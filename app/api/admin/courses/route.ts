// app/api/admin/courses/route.ts - List all courses for admin
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const courses = await prisma.course.findMany({
      include: {
        videos: {
          select: { id: true }
        },
        sections: {
          include: {
            videos: {
              select: { id: true }
            }
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

    return NextResponse.json(courses)
  } catch (error) {
    console.error("Error fetching admin courses:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}