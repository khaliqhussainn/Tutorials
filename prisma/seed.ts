// scripts/seed.ts - Fixed seed file with correct Prisma model names
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const sampleCourses = [
  {
    title: "Complete JavaScript Masterclass 2024",
    description: "Master JavaScript from basics to advanced concepts including ES6+, DOM manipulation, async programming, and modern frameworks. Build real-world projects and become a confident JavaScript developer.",
    category: "Programming",
    level: "BEGINNER" as const,
    isFeatured: true,
    rating: 4.8,
    price: 0,
    isFree: true,
    isPublished: true,
    thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800&h=450&fit=crop"
  },
  {
    title: "UI/UX Design Fundamentals",
    description: "Learn the principles of user interface and user experience design. Master Figma, create wireframes, prototypes, and design systems that users love.",
    category: "Design",
    level: "BEGINNER" as const,
    isFeatured: true,
    rating: 4.9,
    price: 49.99,
    isFree: false,
    isPublished: true,
    thumbnail: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&h=450&fit=crop"
  },
  {
    title: "React & Next.js Full Stack Development",
    description: "Build modern web applications with React and Next.js. Learn hooks, context, server-side rendering, API routes, and deploy production-ready apps.",
    category: "Programming",
    level: "INTERMEDIATE" as const,
    isFeatured: true,
    rating: 4.7,
    price: 0,
    isFree: true,
    isPublished: true,
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=450&fit=crop"
  },
  {
    title: "Digital Marketing Strategy 2024",
    description: "Master digital marketing with SEO, social media marketing, email campaigns, PPC advertising, and analytics. Grow your business online effectively.",
    category: "Marketing",
    level: "BEGINNER" as const,
    isFeatured: false,
    rating: 4.6,
    price: 79.99,
    isFree: false,
    isPublished: true,
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop"
  },
  {
    title: "Python for Data Science & Machine Learning",
    description: "Learn Python programming for data analysis, visualization, and machine learning. Work with pandas, numpy, matplotlib, and scikit-learn libraries.",
    category: "Data Science",
    level: "INTERMEDIATE" as const,
    isFeatured: true,
    rating: 4.8,
    price: 0,
    isFree: true,
    isPublished: true,
    thumbnail: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&h=450&fit=crop"
  },
  {
    title: "Business Strategy & Leadership",
    description: "Develop strategic thinking and leadership skills. Learn to create business plans, manage teams, and drive organizational growth in competitive markets.",
    category: "Business",
    level: "ADVANCED" as const,
    isFeatured: false,
    rating: 4.5,
    price: 129.99,
    isFree: false,
    isPublished: true,
    thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=450&fit=crop"
  },
  {
    title: "Advanced CSS & Sass Techniques",
    description: "Master advanced CSS concepts including Grid, Flexbox, animations, and Sass. Create responsive, modern websites with clean, maintainable code.",
    category: "Programming",
    level: "INTERMEDIATE" as const,
    isFeatured: false,
    rating: 4.7,
    price: 0,
    isFree: true,
    isPublished: true,
    thumbnail: "https://images.unsplash.com/photo-1507721999472-8ed4421c4af2?w=800&h=450&fit=crop"
  },
  {
    title: "Photoshop & Digital Art Mastery",
    description: "Learn professional photo editing and digital art creation with Adobe Photoshop. Master layers, effects, retouching, and create stunning visuals.",
    category: "Design",
    level: "BEGINNER" as const,
    isFeatured: false,
    rating: 4.6,
    price: 59.99,
    isFree: false,
    isPublished: true,
    thumbnail: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&h=450&fit=crop"
  },
  {
    title: "Node.js & Express Backend Development",
    description: "Build scalable backend applications with Node.js and Express. Learn about APIs, databases, authentication, and deployment strategies.",
    category: "Programming",
    level: "INTERMEDIATE" as const,
    isFeatured: false,
    rating: 4.8,
    price: 0,
    isFree: true,
    isPublished: true,
    thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800&h=450&fit=crop"
  },
  {
    title: "Social Media Marketing Mastery",
    description: "Dominate social media platforms with proven strategies. Learn content creation, community management, influencer marketing, and paid advertising.",
    category: "Marketing",
    level: "BEGINNER" as const,
    isFeatured: false,
    rating: 4.5,
    price: 39.99,
    isFree: false,
    isPublished: true,
    thumbnail: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=450&fit=crop"
  },
  {
    title: "SQL Database Design & Management",
    description: "Master SQL and database design principles. Learn to create, query, and optimize databases for real-world applications and data analysis.",
    category: "Data Science",
    level: "BEGINNER" as const,
    isFeatured: false,
    rating: 4.7,
    price: 0,
    isFree: true,
    isPublished: true,
    thumbnail: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&h=450&fit=crop"
  },
  {
    title: "Entrepreneurship & Startup Fundamentals",
    description: "Learn to build and launch successful startups. Covers idea validation, business models, funding, marketing, and scaling strategies.",
    category: "Business",
    level: "BEGINNER" as const,
    isFeatured: true,
    rating: 4.6,
    price: 89.99,
    isFree: false,
    isPublished: true,
    thumbnail: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=450&fit=crop"
  },
  {
    title: "Mobile App Development with React Native",
    description: "Build cross-platform mobile apps with React Native. Learn navigation, state management, native modules, and publishing to app stores.",
    category: "Programming",
    level: "ADVANCED" as const,
    isFeatured: false,
    rating: 4.8,
    price: 0,
    isFree: true,
    isPublished: true,
    thumbnail: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=450&fit=crop"
  }
]

async function main() {
  console.log('🌱 Start seeding...')

  // Hash the admin password
  const adminPassword = await bcrypt.hash('admin123', 12)
  const testUserPassword = await bcrypt.hash('test123', 12)

  // Create admin user with password
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      password: adminPassword, // Update password if user exists
    },
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
      password: adminPassword,
    },
  })

  // Create a regular user for testing with password
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
      password: testUserPassword, // Update password if user exists
    },
    create: {
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      password: testUserPassword,
    },
  })

  // Clear existing courses
  await prisma.course.deleteMany()
  console.log('🗑️ Cleared existing courses')

  // Create courses with sections and videos
  for (const courseData of sampleCourses) {
    const course = await prisma.course.create({
      data: {
        ...courseData
      }
    })

    // Create sections and videos with courseId using correct model names
    const sectionsData = [
      {
        title: "Getting Started",
        description: "Introduction and course overview",
        order: 1,
        videos: [
          {
            title: "Course Introduction",
            description: "Welcome to the course",
            videoUrl: "https://example.com/video1.mp4",
            duration: 300, // 5 minutes
            order: 1,
            aiPrompt: 'This video introduces the course and sets expectations for what students will learn.'
          },
          {
            title: "Setup and Prerequisites",
            description: "What you need to get started",
            videoUrl: "https://example.com/video2.mp4",
            duration: 600, // 10 minutes
            order: 2,
            aiPrompt: 'This video covers the tools and knowledge needed before starting the main content.'
          }
        ]
      },
      {
        title: "Core Concepts",
        description: "Fundamental concepts and principles",
        order: 2,
        videos: [
          {
            title: "Understanding the Basics",
            description: "Core concepts explained",
            videoUrl: "https://example.com/video3.mp4",
            duration: 900, // 15 minutes
            order: 3,
            aiPrompt: 'This video explains the fundamental concepts that form the foundation of the subject.'
          },
          {
            title: "Practical Examples",
            description: "Real-world applications",
            videoUrl: "https://example.com/video4.mp4",
            duration: 1200, // 20 minutes
            order: 4,
            aiPrompt: 'This video demonstrates practical applications of the concepts through real-world examples.'
          },
          {
            title: "Hands-on Practice",
            description: "Practice what you've learned",
            videoUrl: "https://example.com/video5.mp4",
            duration: 1500, // 25 minutes
            order: 5,
            aiPrompt: 'This video provides hands-on exercises to reinforce the learning.'
          }
        ]
      },
      {
        title: "Advanced Topics",
        description: "Deep dive into advanced concepts",
        order: 3,
        videos: [
          {
            title: "Advanced Techniques",
            description: "Professional level techniques",
            videoUrl: "https://example.com/video6.mp4",
            duration: 1800, // 30 minutes
            order: 6,
            aiPrompt: 'This video covers advanced techniques used by professionals in the field.'
          },
          {
            title: "Best Practices",
            description: "Industry best practices",
            videoUrl: "https://example.com/video7.mp4",
            duration: 1200, // 20 minutes
            order: 7,
            aiPrompt: 'This video shares industry best practices and common pitfalls to avoid.'
          }
        ]
      },
      {
        title: "Final Project",
        description: "Put everything together",
        order: 4,
        videos: [
          {
            title: "Project Planning",
            description: "Planning your final project",
            videoUrl: "https://example.com/video8.mp4",
            duration: 900, // 15 minutes
            order: 8,
            aiPrompt: 'This video guides students through planning their capstone project.'
          },
          {
            title: "Project Implementation",
            description: "Building your project step by step",
            videoUrl: "https://example.com/video9.mp4",
            duration: 2400, // 40 minutes
            order: 9,
            aiPrompt: 'This video walks through implementing the final project step by step.'
          },
          {
            title: "Course Conclusion",
            description: "Wrapping up and next steps",
            videoUrl: "https://example.com/video10.mp4",
            duration: 600, // 10 minutes
            order: 10,
            aiPrompt: 'This video concludes the course and provides guidance on next steps.'
          }
        ]
      }
    ];

    for (const sectionData of sectionsData) {
      // Use CourseSection instead of Section
      const section = await prisma.courseSection.create({
        data: {
          title: sectionData.title,
          description: sectionData.description,
          order: sectionData.order,
          courseId: course.id
        }
      });

      for (const videoData of sectionData.videos) {
        const video = await prisma.video.create({
          data: {
            title: videoData.title,
            description: videoData.description,
            videoUrl: videoData.videoUrl,
            duration: videoData.duration,
            order: videoData.order,
            courseId: course.id,
            sectionId: section.id,
            aiPrompt: videoData.aiPrompt
          }
        });

        // Create sample tests for each video
        await prisma.test.create({
          data: {
            videoId: video.id,
            question: `What is the main topic covered in "${video.title}"?`,
            options: [
              'The main concept explained in this video',
              'Unrelated topic A',
              'Unrelated topic B', 
              'Unrelated topic C'
            ],
            correct: 0,
            explanation: `This video focuses on ${video.description?.toLowerCase() || 'the core concepts'}.`,
            difficulty: 'easy',
          },
        });
      }
    }

    // Create enrollment for test user with first course
    if (courseData === sampleCourses[0]) {
      await prisma.enrollment.create({
        data: {
          userId: testUser.id,
          courseId: course.id,
          progress: 25.0 // 25% progress for testing
        },
      });
      
      // Create a favorite for test user
      await prisma.favoriteCourse.create({
        data: {
          userId: testUser.id,
          courseId: course.id
        }
      });
    }

    console.log(`✅ Created course: ${course.title}`)
  }

  console.log('')
  console.log('🎉 Seeding finished!')
  console.log('')
  console.log('👤 Admin Login Credentials:')
  console.log('   Email: admin@example.com')
  console.log('   Password: admin123')
  console.log('')
  console.log('👤 Test User Login Credentials:')
  console.log('   Email: test@example.com')
  console.log('   Password: test123')
  console.log('')
  console.log(`📚 Created ${sampleCourses.length} courses with sections and videos`)
  console.log('📝 Created sample enrollments and favorites for test user')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
