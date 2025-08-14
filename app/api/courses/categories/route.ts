// app/api/courses/categories/route.ts - Get course counts by category
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const categoryCounts = await prisma.course.groupBy({
      by: ['category'],
      where: {
        isPublished: true
      },
      _count: {
        id: true
      }
    })

    // Transform to a more usable format
    const categoryData = categoryCounts.reduce((acc, item) => {
      acc[item.category] = item._count.id
      return acc
    }, {} as Record<string, number>)

    // Add total count
    const totalCourses = await prisma.course.count({
      where: { isPublished: true }
    })
    
    categoryData['All'] = totalCourses

    return NextResponse.json(categoryData)
  } catch (error) {
    console.error("Error fetching category counts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
