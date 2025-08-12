import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// app/api/admin/videos/route.ts - For creating videos with proper duration
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { 
      title, 
      description, 
      videoUrl, 
      duration, // This should come from the upload response
      courseId, 
      sectionId, 
      order 
    } = await request.json()

    const video = await prisma.video.create({
      data: {
        title,
        description,
        videoUrl,
        duration: duration ? Math.round(duration) : null, // Store duration in seconds
        courseId,
        sectionId: sectionId || null,
        order
      },
      include: {
        tests: true
      }
    })

    return NextResponse.json(video)
  } catch (error) {
    console.error("Error creating video:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
type Session = {
  user: {
    role: string;
    // add other user properties if needed
  };
  // add other session properties if needed
};

function getServerSession(authOptions: any): Promise<Session | null> {
  throw new Error("Function not implemented.");
}

