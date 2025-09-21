// app/api/admin/users/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            enrollments: true,
            // Count completed courses (100% progress)
            enrollments: {
              where: { progress: 100 }
            }
          }
        },
        enrollments: {
          select: {
            progress: true,
            enrolledAt: true,
            course: {
              select: {
                videos: {
                  select: {
                    id: true,
                    duration: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate additional metrics for each user
    const enhancedUsers = users.map(user => {
      const totalEnrollments = user._count.enrollments
      const completedCourses = user.enrollments.filter(e => e.progress >= 100).length
      const averageProgress = totalEnrollments > 0 
        ? Math.round(user.enrollments.reduce((acc, e) => acc + e.progress, 0) / totalEnrollments)
        : 0
      
      // Calculate total watch time (approximate from progress and video durations)
      const totalWatchTime = user.enrollments.reduce((acc, enrollment) => {
        const courseDuration = enrollment.course.videos.reduce((sum, video) => sum + (video.duration || 0), 0)
        return acc + Math.round((courseDuration * enrollment.progress) / 100)
      }, 0)

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        isActive: user.isActive ?? true, // Default to true if not set
        _count: {
          enrollments: totalEnrollments,
          completedCourses
        },
        totalWatchTime: Math.round(totalWatchTime / 60), // Convert to minutes
        averageProgress
      }
    })

    return NextResponse.json(enhancedUsers)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// app/api/admin/users/stats/route.ts
export async function getUserStats() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [
      totalUsers,
      activeUsers,
      adminUsers,
      newUsersThisMonth,
      totalEnrollments,
      completedEnrollments
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { progress: 100 } })
    ])

    const avgCompletionRate = totalEnrollments > 0 
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0

    return NextResponse.json({
      totalUsers,
      activeUsers,
      adminUsers,
      newUsersThisMonth,
      totalEnrollments,
      avgCompletionRate
    })
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// app/api/admin/users/[userId]/role/route.ts
export async function updateUserRole(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { role } = await request.json()

    if (!['USER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: { role },
      select: { id: true, email: true, role: true }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Error updating user role:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// app/api/admin/users/[userId]/status/route.ts
export async function updateUserStatus(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { isActive } = await request.json()

    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: { isActive },
      select: { id: true, email: true, isActive: true }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Error updating user status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// app/api/admin/users/export/route.ts
export async function exportUsers() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: { enrollments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Create CSV content
    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Enrollments', 'Created At']
    const csvContent = [
      headers.join(','),
      ...users.map(user => [
        user.id,
        `"${user.name || ''}"`,
        user.email,
        user.role,
        user.isActive ? 'Active' : 'Inactive',
        user._count.enrollments,
        new Date(user.createdAt).toISOString().split('T')[0]
      ].join(','))
    ].join('\n')

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="users-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error("Error exporting users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}