// app/api/courses/[courseId]/videos/route.ts - Fixed order calculation
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateTestQuestions } from "@/lib/ai"

export async function POST(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, description, videoUrl, duration, aiPrompt, sectionId } = await request.json()

    console.log('Creating video:', { title, sectionId, videoUrl: !!videoUrl, duration })

    // Validate required fields
    if (!title || !videoUrl || !sectionId) {
      return NextResponse.json({
        error: "Missing required fields: title, videoUrl, and sectionId are required"
      }, { status: 400 })
    }

    // Verify section exists
    const section = await prisma.courseSection.findFirst({
      where: { 
        id: sectionId,
        courseId: params.courseId
      }
    })

    if (!section) {
      return NextResponse.json({
        error: "Invalid section ID"
      }, { status: 400 })
    }

    // FIXED: Get next order number for the entire course (not just the section)
    const lastVideo = await prisma.video.findFirst({
      where: { 
        courseId: params.courseId
        // Remove sectionId filter to get the highest order across all sections
      },
      orderBy: { order: 'desc' }
    })

    const nextOrder = (lastVideo?.order || 0) + 1

    console.log('Next order will be:', nextOrder)

    // Create video
    const video = await prisma.video.create({
      data: {
        title,
        description: description || null,
        videoUrl,
        duration: duration || 0,
        order: nextOrder,
        courseId: params.courseId,
        sectionId,
        aiPrompt: aiPrompt || null
      }
    })

    console.log('Video created:', video.id)

    // Generate AI tests
    if (aiPrompt) {
      try {
        console.log('Generating AI tests...')
        const questions = await generateTestQuestions(title, description || '', aiPrompt)
        
        for (const question of questions) {
          await prisma.test.create({
            data: {
              videoId: video.id,
              question: question.question,
              options: question.options,
              correct: question.correct
            }
          })
        }
        
        console.log(`Generated ${questions.length} test questions`)
      } catch (testError) {
        console.error('AI test generation failed:', testError)
        // Continue without failing the video creation
      }
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error("Error creating video:", error)
    
    // Enhanced error handling for unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return NextResponse.json({ 
        error: "Video order conflict. Please try again.",
        details: "A video with this order already exists in the course"
      }, { status: 409 })
    }
    
    return NextResponse.json({ 
      error: "Failed to create video",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


















































// // app/api/courses/[courseId]/videos/route.ts - Enhanced with AI integration
// import { NextResponse } from "next/server"
// import { getServerSession } from "next-auth"
// import { authOptions } from "@/lib/auth"
// import { prisma } from "@/lib/prisma"
// import { generateTestQuestions } from "@/lib/ai"

// export async function POST(
//   request: Request,
//   { params }: { params: { courseId: string } }
// ) {
//   try {
//     const session = await getServerSession(authOptions)
    
//     if (!session || session.user.role !== 'ADMIN') {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
//     }

//     const { title, description, videoUrl, duration, aiPrompt, sectionId } = await request.json()

//     console.log('Creating video:', { title, sectionId, videoUrl: !!videoUrl, duration })

//     // Validate required fields
//     if (!title || !videoUrl || !sectionId) {
//       return NextResponse.json({
//         error: "Missing required fields: title, videoUrl, and sectionId are required"
//       }, { status: 400 })
//     }

//     // Verify section exists
//     const section = await prisma.courseSection.findFirst({
//       where: { 
//         id: sectionId,
//         courseId: params.courseId
//       }
//     })

//     if (!section) {
//       return NextResponse.json({
//         error: "Invalid section ID"
//       }, { status: 400 })
//     }

//     // Get next order number
//     const lastVideo = await prisma.video.findFirst({
//       where: { 
//         courseId: params.courseId,
//         sectionId: sectionId
//       },
//       orderBy: { order: 'desc' }
//     })

//     const nextOrder = (lastVideo?.order || 0) + 1

//     // Create video
//     const video = await prisma.video.create({
//       data: {
//         title,
//         description: description || null,
//         videoUrl,
//         duration: duration || 0,
//         order: nextOrder,
//         courseId: params.courseId,
//         sectionId,
//         aiPrompt: aiPrompt || null
//       }
//     })

//     console.log('Video created:', video.id)

//     // Generate AI tests
//     if (aiPrompt) {
//       try {
//         console.log('Generating AI tests...')
//         const questions = await generateTestQuestions(title, description || '', aiPrompt)
        
//         for (const question of questions) {
//           await prisma.test.create({
//             data: {
//               videoId: video.id,
//               question: question.question,
//               options: question.options,
//               correct: question.correct
//             }
//           })
//         }
        
//         console.log(`Generated ${questions.length} test questions`)
//       } catch (testError) {
//         console.error('AI test generation failed:', testError)
//         // Continue without failing the video creation
//       }
//     }

//     return NextResponse.json(video)
//   } catch (error) {
//     console.error("Error creating video:", error)
//     return NextResponse.json({ 
//       error: "Failed to create video",
//       details: error instanceof Error ? error.message : 'Unknown error'
//     }, { status: 500 })
//   }
// }
