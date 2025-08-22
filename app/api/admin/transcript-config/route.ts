// app/api/admin/transcript-config/route.ts - API to check config from frontend
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { checkTranscriptEnvironment } from "@/lib/env-check"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const config = checkTranscriptEnvironment()

    return NextResponse.json({
      ...config,
      providers: {
        openai: !!process.env.OPENAI_API_KEY,
        google: !!process.env.GOOGLE_CLOUD_API_KEY,
        assemblyai: !!process.env.ASSEMBLYAI_API_KEY
      }
    })
  } catch (error) {
    console.error("Error checking transcript config:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
