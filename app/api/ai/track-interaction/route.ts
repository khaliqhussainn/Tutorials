// app/api/ai/track-interaction/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
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

    const { videoId, interaction } = await request.json()

    // Store interaction for analytics
    await prisma.$executeRaw`
      INSERT INTO ai_interactions (user_id, video_id, type, query, response, timestamp)
      VALUES (${user.id}, ${videoId}, ${interaction.type}, ${interaction.query}, ${interaction.response}, ${new Date()})
      ON CONFLICT DO NOTHING
    `

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Track interaction error:', error)
    return NextResponse.json({ success: false })
  }
}

