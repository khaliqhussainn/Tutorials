// app/api/user/streak/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
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

    if (existingStreak) {
      return NextResponse.json(existingStreak)
    }

    // Get yesterday's streak
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const yesterdayStreak = await prisma.dailyStreak.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: yesterday
        }
      }
    })

    const newCount = yesterdayStreak ? yesterdayStreak.count + 1 : 1

    const streak = await prisma.dailyStreak.create({
      data: {
        userId: session.user.id,
        date: today,
        count: newCount
      }
    })

    return NextResponse.json(streak)
  } catch (error) {
    console.error("Error updating streak:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}