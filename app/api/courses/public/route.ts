// Course Website: app/api/courses/public/route.ts (Final Version)
import { NextRequest, NextResponse } from "next/server"
import { getPublishedCourses, validateApiKey } from "@/lib/authUtils"

export async function GET(request: NextRequest) {
  try {
    // Validate API key
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!validateApiKey(apiKey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all published courses
    const courses = await getPublishedCourses()

    return NextResponse.json(courses)

  } catch (error) {
    console.error('Course sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}