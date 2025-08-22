// app/api/admin/videos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const sectionId = searchParams.get('sectionId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    let videos

    if (courseId) {
      // Get videos for a specific course
      videos = await prisma.video.findMany({
        where: {
          OR: [
            { courseId: courseId },
            { 
              section: {
                courseId: courseId
              }
            }
          ]
        },
        include: {
          section: true,
          tests: true,
          transcript: true,
          course: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: [
          { section: { order: 'asc' } },
          { order: 'asc' }
        ]
      })
    } else if (sectionId) {
      // Get videos for a specific section
      videos = await prisma.video.findMany({
        where: {
          sectionId: sectionId
        },
        include: {
          section: true,
          tests: true,
          transcript: true,
          course: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: { order: 'asc' }
      })
    } else {
      // Get all videos with pagination
      videos = await prisma.video.findMany({
        take: limit,
        skip: skip,
        include: {
          section: true,
          tests: true,
          transcript: true,
          course: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    return NextResponse.json(videos)

  } catch (error) {
    console.error('Error fetching videos:', error)
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { 
      title, 
      description, 
      videoUrl, 
      duration, 
      order, 
      courseId, 
      sectionId, 
      aiPrompt,
      generateTranscript = false 
    } = data

    // Validate required fields
    if (!title || !videoUrl) {
      return NextResponse.json(
        { error: 'Title and video URL are required' },
        { status: 400 }
      )
    }

    // Validate that either courseId or sectionId is provided
    if (!courseId && !sectionId) {
      return NextResponse.json(
        { error: 'Either courseId or sectionId must be provided' },
        { status: 400 }
      )
    }

    // If sectionId is provided, get the courseId from the section
    let finalCourseId = courseId
    if (sectionId) {
      const section = await prisma.courseSection.findUnique({
        where: { id: sectionId },
        select: { courseId: true }
      })
      
      if (!section) {
        return NextResponse.json(
          { error: 'Section not found' },
          { status: 404 }
        )
      }
      
      finalCourseId = section.courseId
    }

    // Get the next order number if not provided
    let finalOrder = order
    if (!finalOrder) {
      const lastVideo = await prisma.video.findFirst({
        where: sectionId ? { sectionId } : { courseId: finalCourseId },
        orderBy: { order: 'desc' }
      })
      finalOrder = (lastVideo?.order || 0) + 1
    }

    // Create the video
    const video = await prisma.video.create({
      data: {
        title,
        description,
        videoUrl,
        duration,
        order: finalOrder,
        courseId: finalCourseId,
        sectionId: sectionId || null,
        aiPrompt
      },
      include: {
        section: true,
        tests: true,
        transcript: true,
        course: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    // If transcript generation is requested, trigger it asynchronously
    if (generateTranscript && process.env.OPENAI_API_KEY) {
      // Trigger transcript generation in background
      fetch(`${process.env.NEXTAUTH_URL}/api/admin/videos/${video.id}/generate-transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: video.videoUrl,
          language: 'en'
        })
      }).catch(error => {
        console.error('Failed to generate transcript:', error)
      })
    }

    return NextResponse.json(video, { status: 201 })

  } catch (error) {
    console.error('Error creating video:', error)
    return NextResponse.json(
      { error: 'Failed to create video' },
      { status: 500 }
    )
  }
}