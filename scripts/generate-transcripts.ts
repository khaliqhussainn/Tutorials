// # scripts/generate-transcripts.ts - Script to generate transcripts for existing videos
import { PrismaClient } from '@prisma/client'
import { TranscriptGenerator } from '../lib/transcript-generator'

const prisma = new PrismaClient()

interface VideoToProcess {
  id: string
  title: string
  videoUrl: string
  hasTranscript: boolean
}

async function main() {
  console.log('🚀 Starting transcript generation for existing videos...')

  try {
    // Get all videos without transcripts
    const videos = await prisma.video.findMany({
      where: {
        AND: [
          { videoUrl: { not: null } },
          { 
            OR: [
              { transcript: null },
              { transcript: '' }
            ]
          }
        ]
      },
      select: {
        id: true,
        title: true,
        videoUrl: true,
        transcript: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📹 Found ${videos.length} videos without transcripts`)

    if (videos.length === 0) {
      console.log('✅ All videos already have transcripts!')
      return
    }

    // Ask for confirmation
    console.log('\nVideos to process:')
    videos.forEach((video, index) => {
      console.log(`${index + 1}. ${video.title}`)
    })

    const provider = process.env.TRANSCRIPT_PROVIDER || 'openai'
    console.log(`\nUsing provider: ${provider}`)
    console.log('\nThis will take several minutes per video...')

    // Initialize transcript generator
    const generator = new TranscriptGenerator(provider as any)
    let processed = 0
    let failed = 0

    for (const video of videos) {
      try {
        console.log(`\n[${processed + 1}/${videos.length}] Processing: ${video.title}`)
        
        const startTime = Date.now()
        const result = await generator.generateTranscript(video.videoUrl, video.id)
        const duration = ((Date.now() - startTime) / 1000).toFixed(1)

        console.log(`✅ Success! Generated ${result.transcript.length} characters in ${duration}s`)
        console.log(`   Confidence: ${Math.round((result.confidence || 0) * 100)}%`)
        console.log(`   Language: ${result.language}`)
        
        processed++

        // Add delay to avoid rate limiting
        if (processed < videos.length) {
          console.log('⏳ Waiting 5 seconds before next video...')
          await new Promise(resolve => setTimeout(resolve, 5000))
        }

      } catch (error: any) {
        console.error(`❌ Failed to process "${video.title}":`, error.message)
        failed++
        
        // Continue with next video after shorter delay
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('📊 PROCESSING COMPLETE')
    console.log(`✅ Successfully processed: ${processed} videos`)
    console.log(`❌ Failed: ${failed} videos`)
    console.log(`📈 Success rate: ${Math.round((processed / videos.length) * 100)}%`)

    if (failed > 0) {
      console.log('\n💡 Tips for failed videos:')
      console.log('  - Check if video URLs are accessible')
      console.log('  - Verify API keys and quotas')
      console.log('  - Some videos may be too long or in unsupported formats')
      console.log('  - Try running the script again for failed videos')
    }

  } catch (error) {
    console.error('💥 Script failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
if (require.main === module) {
  main()
    .catch(error => {
      console.error('Unhandled error:', error)
      process.exit(1)
    })
}

export { main as generateTranscriptsForAllVideos }
