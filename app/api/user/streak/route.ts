// app/api/user/streak/route.ts - Update user streak (placeholder)
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if user already has a streak for today
    const existingStreak = await prisma.dailyStreak.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: today
        }
      }
    })

    if (!existingStreak) {
      // Create new streak entry
      await prisma.dailyStreak.create({
        data: {
          userId: session.user.id,
          date: today,
          count: 1
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating streak:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}